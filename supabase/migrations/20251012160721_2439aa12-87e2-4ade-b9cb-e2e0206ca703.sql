-- Unschedule the existing hourly cron job
SELECT cron.unschedule('auto-retry-failed-calls');

-- Create a new cron job that runs every minute
SELECT cron.schedule(
  'auto-retry-failed-calls',
  '* * * * *', -- runs every minute
  $$
  SELECT net.http_post(
    url:='https://ephpobvbzlemgixverve.supabase.co/functions/v1/process-retry-calls',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwaHBvYnZiemxlbWdpeHZlcnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDU5NzUsImV4cCI6MjA3NDYyMTk3NX0.Y-g89AZkXvP9kOQnwEr4QLyoFsY8F3FRpmibaJVSG7k"}'::jsonb
  ) as request_id;
  $$
);