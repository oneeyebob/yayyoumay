-- Add youtube_premium flag to user_settings.
-- When true the junior watch page uses the nocookie embed domain,
-- relying on the user's own Premium subscription to suppress ads.

alter table user_settings
  add column if not exists youtube_premium boolean not null default false;
