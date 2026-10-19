# GraphQL security scorecard

| Field           | Value     |
| --------------- | --------- |
| Audit ID        |           |
| Mode            |           |
| Overall score   |           |
| Provisional?    | yes \| no |
| Risk decision   |           |
| Scoring version | 1.0.0     |

## Category scores

| Category       | Weight | Score | Provisional | Historical | Notes |
| -------------- | -----: | ----: | ----------- | ---------- | ----- |
| identity       |    20% |       |             |            |       |
| authorization  |    30% |       |             |            |       |
| abuse          |    10% |       |             |            |       |
| disclosure     |    10% |       |             |            |       |
| injection      |    10% |       |             |            |       |
| secrets        |     5% |       |             |            |       |
| trust_boundary |    10% |       |             |            |       |
| testing        |     5% |       |             |            |       |

## Check rollup

| Check ID | Status | Score | Evidence path |
| -------- | ------ | ----: | ------------- |
| AUTH-01  |        |       |               |
| …        |        |       |               |

## Coverage notes

Authorization sample: N of M root Query/Mutation fields (…%).
