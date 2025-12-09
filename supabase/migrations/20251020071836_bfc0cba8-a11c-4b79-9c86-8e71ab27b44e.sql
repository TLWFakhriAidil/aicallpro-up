-- Add AlienVoip SIP columns and remove Twilio columns from phone_config
ALTER TABLE public.phone_config 
  ADD COLUMN IF NOT EXISTS sip_proxy TEXT DEFAULT 'sip1.alienvoip.com',
  ADD COLUMN IF NOT EXISTS sip_proxy_sec TEXT DEFAULT 'sip3.alienvoip.com',
  ADD COLUMN IF NOT EXISTS sip_username TEXT,
  ADD COLUMN IF NOT EXISTS sip_password TEXT,
  ADD COLUMN IF NOT EXISTS sip_codec TEXT DEFAULT 'G729',
  DROP COLUMN IF EXISTS twilio_phone_number,
  DROP COLUMN IF EXISTS twilio_account_sid,
  DROP COLUMN IF EXISTS twilio_auth_token;

-- Update provider column default to alienvoip
ALTER TABLE public.phone_config 
  ALTER COLUMN provider SET DEFAULT 'alienvoip';