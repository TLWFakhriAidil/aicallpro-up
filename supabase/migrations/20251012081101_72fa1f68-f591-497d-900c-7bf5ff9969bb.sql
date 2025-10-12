-- Add retry_enabled column to call_logs table
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS retry_enabled BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN call_logs.retry_enabled IS 'Whether auto retry is enabled for this specific call';