"""add_host_auth

Revision ID: 58921ab03043
Revises: 
Create Date: 2026-05-19 10:23:22.386423

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '58921ab03043'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


import uuid

def upgrade() -> None:
    # Create hosts table
    op.create_table(
        'hosts',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('display_name', sa.String(length=60), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_hosts_email', 'hosts', ['email'], unique=True)

    # Create refresh_tokens table
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('host_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.Text(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['host_id'], ['hosts.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('token_hash', name='uq_refresh_tokens_token_hash')
    )
    op.create_index('ix_refresh_tokens_host_id', 'refresh_tokens', ['host_id'], unique=False)

    # Add host_id to events
    op.add_column('events', sa.Column('host_id', sa.UUID(as_uuid=True), nullable=True))
    
    # Seed default host for existing events
    default_host_id = uuid.uuid4()
    op.execute(
        f"INSERT INTO hosts (id, email, password_hash, display_name, created_at) "
        f"VALUES ('{default_host_id}', 'admin@example.com', 'seeded_no_password', 'Admin', NOW())"
    )
    
    # Update existing events
    op.execute(f"UPDATE events SET host_id = '{default_host_id}' WHERE host_id IS NULL")
    
    # Alter column to nullable=False
    op.alter_column('events', 'host_id', existing_type=sa.UUID(as_uuid=True), nullable=False)
    
    op.create_index('ix_events_host_id', 'events', ['host_id'], unique=False)
    op.create_foreign_key('fk_events_host_id_hosts', 'events', 'hosts', ['host_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    op.drop_constraint('fk_events_host_id_hosts', 'events', type_='foreignkey')
    op.drop_index('ix_events_host_id', table_name='events')
    op.drop_column('events', 'host_id')
    op.drop_index('ix_refresh_tokens_host_id', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
    op.drop_index('ix_hosts_email', table_name='hosts')
    op.drop_table('hosts')
