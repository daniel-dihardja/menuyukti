# url-safety

Shared **stdlib-only** helpers for validating HTTPS URLs before storing them (GraphQL) and before outbound requests (agents): no credentials in URL, block obvious internal hostnames and non-public IP literals, and resolve hostnames to addresses for public-IP checks at execution time.
