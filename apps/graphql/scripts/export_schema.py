#!/usr/bin/env python3
"""Print GraphQL SDL to stdout. Run from apps/graphql: uv run python scripts/export_schema.py > schema.graphql"""

from graphql.schema import schema

if __name__ == "__main__":
    print(schema.as_str())
