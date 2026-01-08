"""split profile name into first and last name

Revision ID: 648a37df3428
Revises: 9d21d80181d1
Create Date: 2026-01-07 18:17:27.665551

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '648a37df3428'
down_revision: Union[str, Sequence[str], None] = '9d21d80181d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns
    op.add_column("user_profile", sa.Column("first_name", sa.String(), nullable=True))
    op.add_column("user_profile", sa.Column("last_name", sa.String(), nullable=True))

    # Migrate data: try to split full_name into first_name and last_name
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE user_profile 
            SET 
                first_name = CASE 
                    WHEN full_name LIKE '% %' THEN substr(full_name, 1, instr(full_name, ' ') - 1)
                    ELSE full_name 
                END,
                last_name = CASE 
                    WHEN full_name LIKE '% %' THEN substr(full_name, instr(full_name, ' ') + 1)
                    ELSE NULL 
                END
            WHERE full_name IS NOT NULL
        """
        )
    )

    # Drop old column
    op.drop_column("user_profile", "full_name")


def downgrade() -> None:
    """Downgrade schema."""
    # Add back full_name column
    op.add_column("user_profile", sa.Column("full_name", sa.String(), nullable=True))

    # Migrate data back: combine first_name and last_name
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE user_profile 
            SET full_name = 
                CASE 
                    WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
                    WHEN first_name IS NOT NULL THEN first_name
                    WHEN last_name IS NOT NULL THEN last_name
                    ELSE NULL
                END
        """
        )
    )

    # Drop new columns
    op.drop_column("user_profile", "last_name")
    op.drop_column("user_profile", "first_name")
