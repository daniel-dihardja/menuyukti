# Build from repository root:
#   docker build -f apps/gentic-agents/Dockerfile -t gentic-agents .
#
# Required env at runtime: OPENAI_API_KEY, GRAPHQL_ENDPOINT
# Optional: ADDR (default :7000), OPENAI_MODEL, SYSTEM_PROMPT, MAX_REFLECTION_ITERATIONS

FROM golang:1.26-bookworm AS build
WORKDIR /src

COPY apps/gentic-agents/ ./apps/gentic-agents/

WORKDIR /src/apps/gentic-agents
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /server /server
USER nonroot:nonroot
EXPOSE 7000
ENV ADDR=:7000
ENTRYPOINT ["/server"]
