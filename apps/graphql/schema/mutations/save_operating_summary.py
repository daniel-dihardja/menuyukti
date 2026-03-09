import strawberry

from graphql.data_sources import AnalyticsRun, OperatingProfileSummary, SessionLocal


@strawberry.type
class SaveOperatingSummaryMutation:
    @strawberry.mutation
    def save_operating_summary(
        self,
        location_id: strawberry.ID,
        analytics_run_id: strawberry.ID,
        operating_summary: str,
        prompt_version: str = "v1",
        model: str = "gpt-4o-mini",
    ) -> bool:
        """Upsert a cached LLM-generated operating summary for an analytics run."""
        session = SessionLocal()
        try:
            run = session.get(AnalyticsRun, int(analytics_run_id))
            if run is None or run.location_id != int(location_id):
                return False

            existing = (
                session.query(OperatingProfileSummary)
                .filter_by(analytics_run_id=run.id, prompt_version=prompt_version)
                .first()
            )
            if existing:
                existing.operating_summary = operating_summary
                existing.model = model
            else:
                session.add(
                    OperatingProfileSummary(
                        location_id=int(location_id),
                        analytics_run_id=run.id,
                        operating_summary=operating_summary,
                        prompt_version=prompt_version,
                        model=model,
                    )
                )
            session.commit()
            return True
        finally:
            session.close()
