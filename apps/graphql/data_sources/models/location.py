"""Location ORM model."""

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from graphql.data_sources.database import Base


class Location(Base):
    """
    Restaurant / location dimension for analytics runs.
    """

    __tablename__ = "location"

    id = Column(Integer, primary_key=True)
    name = Column(String(256), nullable=False)
    street = Column(String(512), nullable=True)
    city = Column(String(128), nullable=True)
    country = Column(String(128), nullable=True)
    currency = Column(String(16), nullable=True)
    workspace_id = Column(
        Integer,
        ForeignKey("workspace.id"),
        nullable=True,
        index=True,
    )
    clerk_user_id = Column(String(128), nullable=True, index=True)
    node_id = Column(
        Integer,
        ForeignKey("node.id", use_alter=True, name="fk_location_node_id"),
        nullable=True,
        index=True,
    )

    workspace = relationship("Workspace", back_populates="locations")
    instagram_posts = relationship("InstagramPost", back_populates="location")
    nodes = relationship(
        "Node",
        back_populates="location",
        foreign_keys="Node.location_id",
    )
    location_root_node = relationship(
        "Node",
        foreign_keys=[node_id],
        post_update=True,
    )
