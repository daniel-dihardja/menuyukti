"""OpenAI-compatible embedding client (Vercel AI Gateway or OpenAI)."""

from __future__ import annotations

import os
from collections.abc import Callable, Sequence
from typing import Protocol

import httpx

DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
_AI_GATEWAY_BASE = "https://ai-gateway.vercel.sh/v1"
_OPENAI_BASE = "https://api.openai.com/v1"


class Embedder(Protocol):
    def embed_texts(self, texts: Sequence[str]) -> list[list[float]]: ...


def resolve_embedding_credentials() -> tuple[str, str]:
    """Return (api_key, base_url) for embeddings.

    Prefers AI Gateway when ``AI_GATEWAY_API_KEY`` / ``VERCEL_OIDC_TOKEN`` is set;
    otherwise falls back to ``OPENAI_API_KEY`` + OpenAI API.
    """
    gateway_key = os.environ.get("AI_GATEWAY_API_KEY") or os.environ.get("VERCEL_OIDC_TOKEN")
    if gateway_key:
        return gateway_key, os.environ.get("KNOWLEDGE_EMBEDDING_BASE_URL", _AI_GATEWAY_BASE).rstrip(
            "/"
        )
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        return openai_key, os.environ.get("KNOWLEDGE_EMBEDDING_BASE_URL", _OPENAI_BASE).rstrip("/")
    raise RuntimeError(
        "Missing embedding credentials: set AI_GATEWAY_API_KEY (preferred) or OPENAI_API_KEY"
    )


def resolve_embedding_model() -> str:
    raw = os.environ.get("KNOWLEDGE_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL).strip()
    if not raw:
        return DEFAULT_EMBEDDING_MODEL
    # Gateway accepts provider/model; strip openai/ for OpenAI-compatible body when needed.
    return raw


class HttpEmbedder:
    """POST /embeddings against an OpenAI-compatible endpoint."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        timeout_s: float = 60.0,
    ) -> None:
        if api_key is None or base_url is None:
            key, url = resolve_embedding_credentials()
            api_key = api_key or key
            base_url = base_url or url
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model or resolve_embedding_model()
        self.timeout_s = timeout_s

    def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        # Gateway model ids often use openai/text-embedding-3-small
        model = self.model
        if self.base_url.rstrip("/").endswith("ai-gateway.vercel.sh/v1") and "/" not in model:
            model = f"openai/{model}"
        payload = {"model": model, "input": list(texts)}
        with httpx.Client(timeout=self.timeout_s) as client:
            resp = client.post(
                f"{self.base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
        items = data.get("data") or []
        # API may return out of order; sort by index
        ordered = sorted(items, key=lambda row: int(row.get("index", 0)))
        vectors: list[list[float]] = []
        for row in ordered:
            emb = row.get("embedding")
            if not isinstance(emb, list):
                raise RuntimeError("Embedding API returned a non-list embedding")
            vectors.append([float(x) for x in emb])
        if len(vectors) != len(texts):
            raise RuntimeError(
                f"Embedding API returned {len(vectors)} vectors for {len(texts)} inputs"
            )
        return vectors


class StaticEmbedder:
    """Deterministic fake embedder for tests (hash-based unit vectors)."""

    def __init__(self, dims: int = 32) -> None:
        self.dims = dims

    def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for text in texts:
            vec = [0.0] * self.dims
            for i, ch in enumerate(text.encode("utf-8")):
                vec[i % self.dims] += (ch % 31) / 31.0
            norm = sum(v * v for v in vec) ** 0.5 or 1.0
            out.append([v / norm for v in vec])
        return out


EmbedderFactory = Callable[[], Embedder]


def default_embedder() -> Embedder:
    return HttpEmbedder()
