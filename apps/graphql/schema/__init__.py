import strawberry
from strawberry.extensions import (
    AddValidationRules,
    MaxAliasesLimiter,
    MaxTokensLimiter,
    QueryDepthLimiter,
)

from graphql.context import RequestSessionExtension
from graphql.limits import (
    QUERY_MAX_ALIASES,
    QUERY_MAX_DEPTH,
    QUERY_MAX_FIELD_SELECTIONS,
    QUERY_MAX_QUERY_COMPLEXITY,
    QUERY_MAX_TOKENS,
)

from .max_field_selections import create_max_field_selections_rule
from .mutation import Mutation
from .query import Query
from .query_complexity import create_query_complexity_rule

schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    extensions=[
        RequestSessionExtension,
        QueryDepthLimiter(max_depth=QUERY_MAX_DEPTH),
        MaxAliasesLimiter(max_alias_count=QUERY_MAX_ALIASES),
        MaxTokensLimiter(max_token_count=QUERY_MAX_TOKENS),
        AddValidationRules(
            [
                create_max_field_selections_rule(QUERY_MAX_FIELD_SELECTIONS),
                create_query_complexity_rule(QUERY_MAX_QUERY_COMPLEXITY),
            ]
        ),
    ],
)
