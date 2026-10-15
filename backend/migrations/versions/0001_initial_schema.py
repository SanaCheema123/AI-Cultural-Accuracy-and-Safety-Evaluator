"""initial schema bootstrap

Revision ID: 0001
Revises: None
"""
from alembic import op
from app.core.db import Base
from app.models import entities  # noqa
revision="0001";down_revision=None;branch_labels=None;depends_on=None

def upgrade():
    bind=op.get_bind();Base.metadata.create_all(bind=bind)

def downgrade():
    bind=op.get_bind();Base.metadata.drop_all(bind=bind)
