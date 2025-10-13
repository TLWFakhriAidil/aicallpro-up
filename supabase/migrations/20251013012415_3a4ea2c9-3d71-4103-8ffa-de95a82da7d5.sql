-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule process-retry-calls to run every hour
SELECT cron.schedule(
  'process-retry-calls-hourly',
  '0 * * * *', -- At minute 0 of every hour (e.g., 1:00, 2:00, 3:00, etc.)
  $$
  SELECT
    net.http_post(
        url:='https://ephpobvbzlemgixverve.supabase.co/functions/v1/process-retry-calls',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwaHBvYnZiemxlbWdpeHZlcnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDU5NzUsImV4cCI6MjA3NDYyMTk3NX0.Y-g89AZkXvP9kOQnwEr4QLyoFsY8F3FRpmibaJVSG7k"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);