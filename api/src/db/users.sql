create table if NOT exists users (
    id bigserial primary key,
   EMAIL TEXT not null unique,
    password_hash text not null,
    created_at timestamptz not null default now()
);

ALTER TABLE links ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX idx_links_user_id ON links(user_id);
