create table if not exists clicks(
      id         BIGSERIAL PRIMARY KEY,
  link_id    BIGINT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referrer   TEXT,
  user_agent TEXT
);

CREATE INDEX if NOT EXISTS idx_clicks_link_id ON clicks(link_id, clicked_at);