-- Keyword blacklist: words that filter matching titles from curator search results.
-- Keywords are per-user (not per-profile) — one blacklist per account.

create table if not exists keyword_blacklist (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  keyword    text        not null check (char_length(trim(keyword)) > 0),
  created_at timestamptz not null default now(),
  constraint keyword_blacklist_user_keyword_unique unique (user_id, keyword)
);

alter table keyword_blacklist enable row level security;

create policy "Users manage their own keyword blacklist"
  on keyword_blacklist
  for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);
