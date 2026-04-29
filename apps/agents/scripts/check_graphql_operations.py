"""Validate agents GraphQL operations against backend root schema fields."""

from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = REPO_ROOT / "apps" / "graphql" / "schema.graphql"
OPERATIONS_PATH = REPO_ROOT / "apps" / "agents" / "agents" / "graphql_operations.py"


def parse_root_fields(schema_text: str, root_name: str) -> set[str]:
    lines = schema_text.splitlines()
    start_idx = -1
    for idx, line in enumerate(lines):
        if line.strip() == f"type {root_name} {{":
            start_idx = idx
            break
    if start_idx < 0:
        return set()
    fields: set[str] = set()
    for line in lines[start_idx + 1 :]:
        if line.strip() == "}":
            break
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        field_match = re.match(r"([A-Za-z_][A-Za-z0-9_]*)\s*(\(|:)", line)
        if field_match:
            fields.add(field_match.group(1))
    return fields


def extract_operation_docs(text: str) -> list[str]:
    docs: list[str] = []
    for match in re.finditer(r'"""(.*?)"""', text, re.DOTALL):
        value = match.group(1)
        if re.search(r"\b(query|mutation)\b", value):
            docs.append(value)
    return docs


def operation_type(doc: str) -> str | None:
    if re.search(r"\bmutation\b", doc):
        return "Mutation"
    if re.search(r"\bquery\b", doc):
        return "Query"
    return None


def first_root_field(doc: str) -> str | None:
    if "{" not in doc:
        return None
    body = doc.split("{", 1)[1]
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("}"):
            continue
        line = re.sub(r"^[A-Za-z_][A-Za-z0-9_]*\s*:\s*", "", line)
        match = re.match(r"([A-Za-z_][A-Za-z0-9_]*)", line)
        if match:
            return match.group(1)
    return None


def main() -> None:
    schema_text = SCHEMA_PATH.read_text(encoding="utf-8")
    ops_text = OPERATIONS_PATH.read_text(encoding="utf-8")
    query_fields = parse_root_fields(schema_text, "Query")
    mutation_fields = parse_root_fields(schema_text, "Mutation")
    errors: list[str] = []

    for doc in extract_operation_docs(ops_text):
        op_type = operation_type(doc)
        field = first_root_field(doc)
        if not op_type or not field:
            continue
        root_fields = query_fields if op_type == "Query" else mutation_fields
        if field not in root_fields:
            errors.append(f"Missing {op_type}.{field} for operation:\n{doc.strip().splitlines()[0]}")

    if errors:
        for err in errors:
            print(err)
        raise SystemExit(1)

    print("GraphQL operation validation passed for apps/agents.")


if __name__ == "__main__":
    main()
