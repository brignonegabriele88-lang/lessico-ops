create table if not exists player_profiles (
  user_id    text primary key,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);
