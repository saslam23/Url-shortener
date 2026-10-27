CREATE Table links(
    id Bigserial Primary Key,
    code varchar(16) not null unique,
    target_url text not null,
    created_at timestamptz  NOT NULL default now(),
    expires_at timestamptz
)
