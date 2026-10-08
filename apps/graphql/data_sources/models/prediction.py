"""Location-scoped prediction game: question, outcomes, and guest votes."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location

PREDICTION_STATUS_OPEN = "open"
PREDICTION_STATUS_CLOSED = "closed"
PREDICTION_STATUS_RESOLVED = "resolved"
KNOWN_PREDICTION_STATUSES = frozenset(
    {
        PREDICTION_STATUS_OPEN,
        PREDICTION_STATUS_CLOSED,
        PREDICTION_STATUS_RESOLVED,
    }
)

REWARD_MODE_SOCIAL = "social"
REWARD_MODE_POINTS = "points"
KNOWN_REWARD_MODES = frozenset({REWARD_MODE_SOCIAL, REWARD_MODE_POINTS})


class Prediction(Base):
    """Owner-created prediction for guests to vote on."""

    __tablename__ = "prediction"
    __table_args__ = (
        Index("ix_prediction_location_status", "location_id", "status"),
        Index("ix_prediction_location_closes_at", "location_id", "closes_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=PREDICTION_STATUS_OPEN,
        server_default=text(f"'{PREDICTION_STATUS_OPEN}'"),
    )
    closes_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reward_mode: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=REWARD_MODE_SOCIAL,
        server_default=text(f"'{REWARD_MODE_SOCIAL}'"),
    )
    points_for_vote: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    points_for_correct: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    winning_outcome_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey(
            "prediction_outcome.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_prediction_winning_outcome_id",
        ),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    location: Mapped[Location] = relationship(
        "Location",
        back_populates="predictions",
    )
    outcomes: Mapped[list[PredictionOutcome]] = relationship(
        "PredictionOutcome",
        back_populates="prediction",
        cascade="all, delete-orphan",
        foreign_keys="PredictionOutcome.prediction_id",
        order_by="PredictionOutcome.sort_order, PredictionOutcome.id",
    )
    votes: Mapped[list[PredictionVote]] = relationship(
        "PredictionVote",
        back_populates="prediction",
        cascade="all, delete-orphan",
        order_by="PredictionVote.created_at",
    )
    winning_outcome: Mapped[PredictionOutcome | None] = relationship(
        "PredictionOutcome",
        foreign_keys=[winning_outcome_id],
        post_update=True,
    )


class PredictionOutcome(Base):
    """One labeled outcome option on a prediction."""

    __tablename__ = "prediction_outcome"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prediction_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("prediction.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    label: Mapped[str] = mapped_column(String(256), nullable=False)
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    prediction: Mapped[Prediction] = relationship(
        "Prediction",
        back_populates="outcomes",
        foreign_keys=[prediction_id],
    )
    votes: Mapped[list[PredictionVote]] = relationship(
        "PredictionVote",
        back_populates="outcome",
    )


class PredictionVote(Base):
    """One guest vote per prediction (Clerk-keyed)."""

    __tablename__ = "prediction_vote"
    __table_args__ = (
        UniqueConstraint(
            "prediction_id",
            "clerk_user_id",
            name="uq_prediction_vote_prediction_clerk_user",
        ),
        Index("ix_prediction_vote_clerk_user_id", "clerk_user_id", unique=False),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prediction_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("prediction.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    outcome_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("prediction_outcome.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    prediction: Mapped[Prediction] = relationship(
        "Prediction",
        back_populates="votes",
    )
    outcome: Mapped[PredictionOutcome] = relationship(
        "PredictionOutcome",
        back_populates="votes",
    )
