-- Enable required extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a scheduled job to expire trials every hour
-- This checks for any trial subscriptions that have passed their trial_end_date
SELECT cron.schedule(
  'expire-trials-hourly',
  '0 * * * *', -- Run at the start of every hour
  $$
  SELECT
    net.http_post(
        url:='https://ephpobvbzlemgixverve.supabase.co/functions/v1/expire-trials',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwaHBvYnZiemxlbWdpeHZlcnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDU5NzUsImV4cCI6MjA3NDYyMTk3NX0.Y-g89AZkXvP9kOQnwEr4QLyoFsY8F3FRpmibaJVSG7k"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
