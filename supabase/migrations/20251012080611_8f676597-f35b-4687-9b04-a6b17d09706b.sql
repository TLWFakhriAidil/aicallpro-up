-- Add retry configuration columns to call_logs table
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS retry_interval_minutes INTEGER DEFAULT 360,
ADD COLUMN IF NOT EXISTS max_retry_attempts INTEGER DEFAULT 3;

-- Add comment for documentation
COMMENT ON COLUMN call_logs.retry_interval_minutes IS 'How many minutes to wait before retrying this call';
COMMENT ON COLUMN call_logs.max_retry_attempts IS 'Maximum number of retry attempts for this call';