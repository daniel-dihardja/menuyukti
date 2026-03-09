"""Public holiday discovery pipeline: search, LLM extraction, and post-processing."""

import asyncio
import logging
import os
from datetime import datetime
from typing import List
from urllib.parse import urlparse

from langchain_openai import ChatOpenAI
from pydantic import BaseModel
from tavily import AsyncTavilyClient

from agent.state import HolidayType, NationalHoliday

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pipeline step 1: generate search queries
# ---------------------------------------------------------------------------


def generate_holiday_queries(country: str, date_start: str, date_end: str) -> list[str]:
    """Return a deterministic list of search queries covering the date range."""
    start_dt = datetime.strptime(date_start, "%Y-%m-%d")
    end_dt = datetime.strptime(date_end, "%Y-%m-%d")

    years: set[int] = set()
    year = start_dt.year
    while year <= end_dt.year:
        years.add(year)
        year += 1

    queries: list[str] = []
    for y in sorted(years):
        queries += [
            f"official public holidays {country} {y}",
            f"government public holidays {country} {y}",
            f"religious public holidays {country} {y}",
        ]

    # Add a per-month query when the range fits inside a single month
    if start_dt.year == end_dt.year and start_dt.month == end_dt.month:
        month_name = start_dt.strftime("%B")
        queries.append(f"public holidays {country} {month_name} {start_dt.year}")

    logger.debug("Generated %d holiday queries for %s: %s", len(queries), country, queries)
    return queries


# ---------------------------------------------------------------------------
# Pipeline step 2: structured search
# ---------------------------------------------------------------------------


async def search_sources(query: str) -> list[dict]:
    """Search Tavily and return structured result records."""
    client = AsyncTavilyClient(api_key=os.environ["TAVILY_API_KEY"])
    try:
        raw = await client.search(query=query, max_results=10)
    except Exception:
        logger.exception("Tavily search failed for query=%r", query)
        return []

    results = raw.get("results", [])
    structured: list[dict] = []
    for r in results:
        url = r.get("url", "")
        structured.append({
            "title": r.get("title", ""),
            "url": url,
            "content": r.get("content", ""),
            "query": query,
            "domain": urlparse(url).netloc if url else "",
        })

    logger.debug(
        "Query %r returned %d results: %s",
        query,
        len(structured),
        [r["url"] for r in structured],
    )
    return structured


# ---------------------------------------------------------------------------
# Pydantic models for structured LLM extraction
# ---------------------------------------------------------------------------


class _HolidayCandidate(BaseModel):
    localName: str
    name: str
    date: str
    type: HolidayType
    isPublicHoliday: bool
    sourceUrl: str
    sourceTitle: str


class _HolidayExtractionResult(BaseModel):
    holidays: List[_HolidayCandidate]


# ---------------------------------------------------------------------------
# Pipeline step 3: per-query extraction
# ---------------------------------------------------------------------------

_EXTRACTION_PROMPT = """\
You are a public holiday data extractor.

Extract every holiday mentioned in the search results below for {country}.
Only include holidays that appear to fall between {date_start} and {date_end}.

For each holiday return:
- localName: official name in the local language
- name: English translation
- date: exact date in YYYY-MM-DD format
- type: one of "public", "regional", "religious_observance", "unknown"
- isPublicHoliday: true only if it is an official government-declared public holiday
- sourceUrl: URL of the result you found it in
- sourceTitle: title of that result

Search results:
{results_text}
"""


async def extract_holidays_from_results(
    country: str,
    date_start: str,
    date_end: str,
    results: list[dict],
) -> list[NationalHoliday]:
    """Extract holiday candidates from a single query's result set via a bounded LLM call."""
    if not results:
        return []

    results_text = "\n\n".join(
        f"[{r['title']}] ({r['url']})\n{r['content']}" for r in results
    )
    prompt = _EXTRACTION_PROMPT.format(
        country=country,
        date_start=date_start,
        date_end=date_end,
        results_text=results_text,
    )

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(_HolidayExtractionResult)

    try:
        result: _HolidayExtractionResult = await structured_llm.ainvoke(prompt)
    except Exception:
        logger.exception(
            "LLM extraction failed for query results (country=%s, first_url=%s)",
            country,
            results[0].get("url") if results else "n/a",
        )
        return []

    candidates: list[NationalHoliday] = [
        NationalHoliday(
            localName=h.localName,
            name=h.name,
            date=h.date,
            type=h.type,
            isPublicHoliday=h.isPublicHoliday,
            sourceUrl=h.sourceUrl,
            sourceTitle=h.sourceTitle,
        )
        for h in result.holidays
    ]
    logger.debug(
        "Extraction returned %d candidates from %d results",
        len(candidates),
        len(results),
    )
    return candidates


# ---------------------------------------------------------------------------
# Pipeline steps 4-6: merge, deduplicate, filter
# ---------------------------------------------------------------------------


def merge_holidays(candidates_lists: list[list[NationalHoliday]]) -> list[NationalHoliday]:
    """Flatten all per-query candidate lists into a single list."""
    merged = [h for batch in candidates_lists for h in batch]
    logger.debug("Merged %d total holiday candidates", len(merged))
    return merged


def deduplicate_holidays(holidays: list[NationalHoliday]) -> list[NationalHoliday]:
    """Deduplicate by (date, normalised primary name); keep first occurrence."""
    seen: set[tuple[str, str]] = set()
    unique: list[NationalHoliday] = []
    for h in holidays:
        primary = (h.get("name") or h.get("localName") or "").strip().lower()
        key = (h["date"], primary)
        if key not in seen:
            seen.add(key)
            unique.append(h)
    logger.debug("Deduplicated %d -> %d holidays", len(holidays), len(unique))
    return unique


def filter_holidays_by_date(
    holidays: list[NationalHoliday],
    date_start: str,
    date_end: str,
) -> list[NationalHoliday]:
    """Keep only public holidays with valid dates inside [date_start, date_end]."""
    start_dt = datetime.strptime(date_start, "%Y-%m-%d").date()
    end_dt = datetime.strptime(date_end, "%Y-%m-%d").date()

    filtered: list[NationalHoliday] = []
    for h in holidays:
        try:
            entry_date = datetime.strptime(h["date"], "%Y-%m-%d").date()
        except ValueError:
            logger.warning("Rejected holiday with unparseable date: %r (%s)", h["date"], h.get("name"))
            continue

        if not (start_dt <= entry_date <= end_dt):
            continue

        if not (h.get("isPublicHoliday") or h.get("type") == "public"):
            continue

        filtered.append(h)

    logger.debug("Filtered to %d public holidays in range %s – %s", len(filtered), date_start, date_end)
    return filtered


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


async def _search_and_extract(
    query: str,
    country: str,
    date_start: str,
    date_end: str,
) -> list[NationalHoliday]:
    """Run search + extraction for a single query."""
    results = await search_sources(query)
    logger.info("Query %r: %d results", query, len(results))
    if not results:
        return []
    candidates = await extract_holidays_from_results(country, date_start, date_end, results)
    logger.info("Query %r: extracted %d candidates", query, len(candidates))
    return candidates


async def search_public_holidays(
    country: str,
    date_start: str,
    date_end: str,
) -> list[NationalHoliday] | None:
    """Deterministic multi-step pipeline to find public holidays."""
    queries = generate_holiday_queries(country, date_start, date_end)
    logger.info("Holiday search: %d queries for %s (%s – %s)", len(queries), country, date_start, date_end)

    all_candidates: list[list[NationalHoliday]] = await asyncio.gather(
        *[_search_and_extract(q, country, date_start, date_end) for q in queries]
    )

    merged = merge_holidays(list(all_candidates))
    deduped = deduplicate_holidays(merged)
    final = filter_holidays_by_date(deduped, date_start, date_end)

    logger.info(
        "Holiday pipeline complete: merged=%d, deduped=%d, final=%d",
        len(merged),
        len(deduped),
        len(final),
    )
    return final if final else None
