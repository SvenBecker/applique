"""add_error_message_to_job_postings

Revision ID: 305914767b59
Revises: a8cabb549746
Create Date: 2026-01-05 14:55:26.601627

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '305914767b59'
down_revision: Union[str, Sequence[str], None] = 'a8cabb549746'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('job_postings', sa.Column('error_message', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('job_postings', 'error_message')
