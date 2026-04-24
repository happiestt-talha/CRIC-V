"""rename_verification_columns

Revision ID: c2f0a833c7c6
Revises: 915a59cedd4d
Create Date: 2026-04-24 18:20:57.693457

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2f0a833c7c6'
down_revision: Union[str, Sequence[str], None] = '915a59cedd4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename columns using batch_op for SQLite compatibility
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('is_verified', new_column_name='email_verified')
        batch_op.alter_column('verification_token', new_column_name='email_verification_token')
        batch_op.add_column(sa.Column('verification_sent_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('verification_sent_at')
        batch_op.alter_column('email_verification_token', new_column_name='verification_token')
        batch_op.alter_column('email_verified', new_column_name='is_verified')
