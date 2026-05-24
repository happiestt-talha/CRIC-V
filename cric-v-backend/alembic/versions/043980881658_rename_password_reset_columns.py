"""rename_password_reset_columns

Revision ID: 043980881658
Revises: c2f0a833c7c6
Create Date: 2026-04-24 18:27:40.927428

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '043980881658'
down_revision: Union[str, Sequence[str], None] = 'c2f0a833c7c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('reset_token', new_column_name='password_reset_token')
        batch_op.alter_column('reset_token_expires', new_column_name='password_reset_token_expires_at')
        batch_op.add_column(sa.Column('must_change_password', sa.Boolean(), server_default='0', nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('must_change_password')
        batch_op.alter_column('password_reset_token_expires_at', new_column_name='reset_token_expires')
        batch_op.alter_column('password_reset_token', new_column_name='reset_token')
