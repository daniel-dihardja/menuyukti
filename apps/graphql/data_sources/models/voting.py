"""Location-scoped voting poll: question, outcomes, and guest votes."""

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

VOTING_STATUS_OPEN = "open"
VOTING_STATUS_CLOSED = "closed"
VOTING_STATUS_RESOLVED = "resolved"
KNOWN_VOTING_STATUSES = frozenset(
    {
        VOTING_STATUS_OPEN,
        VOTING_STATUS_CLOSED,
        VOTING_STATUS_RESOLVED,
    }
)

REWARD_MODE_SOCIAL = "social"
REWARD_MODE_POINTS = "points"
KNOWN_REWARD_MODES = frozenset({REWARD_MODE_SOCIAL, REWARD_MODE_POINTS})


class Voting(Base):
    """Owner-created voting for guests to vote on."""

    __tablename__ = "voting"
    __table_args__ = (
        Index("ix_voting_location_status", "location_id", "status"),
        Index("ix_voting_location_closes_at", "location_id", "closes_at"),
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
        default=VOTING_STATUS_OPEN,
        server_default=text(f"'{VOTING_STATUS_OPEN}'"),
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
            "voting_outcome.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_voting_winning_outcome_id",
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
        back_populates="votings",
    )
    outcomes: Mapped[list[VotingOutcome]] = relationship(
        "VotingOutcome",
        back_populates="voting",
        cascade="all, delete-orphan",
        foreign_keys="VotingOutcome.voting_id",
        order_by="VotingOutcome.sort_order, VotingOutcome.id",
    )
    votes: Mapped[list[VotingVote]] = relationship(
        "VotingVote",
        back_populates="voting",
        cascade="all, delete-orphan",
        order_by="VotingVote.created_at",
    )
    winning_outcome: Mapped[VotingOutcome | None] = relationship(
        "VotingOutcome",
        foreign_keys=[winning_outcome_id],
        post_update=True,
    )


class VotingOutcome(Base):
    """One labeled outcome option on a voting."""

    __tablename__ = "voting_outcome"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    voting_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("voting.id", ondelete="CASCADE"),
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

    voting: Mapped[Voting] = relationship(
        "Voting",
        back_populates="outcomes",
        foreign_keys=[voting_id],
    )
    votes: Mapped[list[VotingVote]] = relationship(
        "VotingVote",
        back_populates="outcome",
    )


class VotingVote(Base):
    """One guest vote per voting (Clerk-keyed)."""

    __tablename__ = "voting_vote"
    __table_args__ = (
        UniqueConstraint(
            "voting_id",
            "clerk_user_id",
            name="uq_voting_vote_voting_clerk_user",
        ),
        Index("ix_voting_vote_clerk_user_id", "clerk_user_id", unique=False),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    voting_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("voting.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    outcome_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("voting_outcome.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    voting: Mapped[Voting] = relationship(
        "Voting",
        back_populates="votes",
    )
    outcome: Mapped[VotingOutcome] = relationship(
        "VotingOutcome",
        back_populates="votes",
    )
