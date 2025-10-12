-- Add parent_call_id to track retry relationships
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS parent_call_id uuid REFERENCES call_logs(id);

-- Update default retry interval to 6 hours (360 minutes)
ALTER TABLE campaigns 
ALTER COLUMN retry_interval_minutes SET DEFAULT 360;

-- Create index for efficient retry queries
CREATE INDEX IF NOT EXISTS idx_call_logs_retry_lookup 
ON call_logs(campaign_id, status, retry_count, created_at) 
WHERE status != 'answered';