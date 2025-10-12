-- Add columns to track retry scheduling
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN call_logs.last_retry_at IS 'Timestamp of the last retry attempt';
COMMENT ON COLUMN call_logs.next_retry_at IS 'Scheduled timestamp for the next retry attempt';