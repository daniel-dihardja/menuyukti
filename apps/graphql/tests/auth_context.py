"""GraphQL context used in tests so resolvers see an authenticated user."""

GRAPHQL_TEST_USER_ID = "clerk_test_user"


def graphql_auth_context() -> dict[str, str]:
    return {"user_id": GRAPHQL_TEST_USER_ID}
