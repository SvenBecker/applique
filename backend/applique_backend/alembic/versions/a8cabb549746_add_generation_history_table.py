"""add_generation_history_table

Revision ID: a8cabb549746
Revises: fb66ff540989
Create Date: 2026-01-04 21:20:54.318728

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8cabb549746'
down_revision: Union[str, Sequence[str], None] = 'fb66ff540989'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'generation_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('posting_id', sa.Integer(), nullable=True),
        sa.Column('company_name', sa.String(), nullable=True),
        sa.Column('job_title', sa.String(), nullable=True),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('cv_file', sa.String(), nullable=True),
        sa.Column('cover_letter_file', sa.String(), nullable=True),
        sa.Column('attachments', sa.JSON(), nullable=True),
        sa.Column('combined', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_generation_history_posting_id'), 'generation_history', ['posting_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_generation_history_posting_id'), table_name='generation_history')
    op.drop_table('generation_history')
