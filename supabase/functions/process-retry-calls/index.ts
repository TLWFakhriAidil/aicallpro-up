import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting auto-retry processing job...');

    // Find calls ready for retry based on scheduled next_retry_at time
    const { data: failedCalls, error: callsError } = await supabaseAdmin
      .from('call_logs')
      .select('id, phone_number, customer_name, retry_count, created_at, campaign_id, user_id, retry_interval_minutes, max_retry_attempts, next_retry_at')
      .eq('retry_enabled', true)
      .neq('status', 'answered')
      .not('next_retry_at', 'is', null)
      .lte('next_retry_at', new Date().toISOString());
    
    if (callsError) {
      console.error('Error fetching calls:', callsError);
      throw callsError;
    }

    if (!failedCalls || failedCalls.length === 0) {
      console.log('No calls scheduled for retry at this time');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No calls scheduled for retry at this time',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${failedCalls.length} calls scheduled for retry`);

    let totalRetriedCalls = 0;

    // Filter calls that haven't exceeded max attempts
    const callsToRetry = failedCalls.filter(call => {
      if (call.retry_count >= call.max_retry_attempts) {
        console.log(`Call ${call.id} has reached max retry attempts (${call.max_retry_attempts})`);
        return false;
      }
      
      console.log(`Call ${call.id} scheduled for retry at ${call.next_retry_at} (attempt ${call.retry_count + 1}/${call.max_retry_attempts})`);
      return true;
    });

    if (callsToRetry.length === 0) {
      console.log('All scheduled calls have exceeded max retry attempts');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'All scheduled calls have exceeded max retry attempts',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`${callsToRetry.length} calls will be retried`);

    // Process each call individually
    for (const call of callsToRetry) {
      try {
        // Get campaign info
        const { data: campaign, error: campaignError } = await supabaseAdmin
          .from('campaigns')
          .select('campaign_name, prompt_id')
          .eq('id', call.campaign_id)
          .single();

        if (campaignError || !campaign) {
          console.error(`Error fetching campaign for call ${call.id}:`, campaignError);
          continue;
        }

        console.log(`Retrying call to ${call.phone_number} (attempt ${call.retry_count + 1}/${call.max_retry_attempts})`);
        
        // Use the batch-call function to make the retry call
        const { data: response, error: callError } = await supabaseAdmin.functions.invoke('batch-call', {
          body: {
            userId: call.user_id,
            campaignName: `${campaign.campaign_name} (Auto Retry ${call.retry_count + 1})`,
            promptId: campaign.prompt_id,
            phoneNumbers: [call.phone_number],
            phoneNumbersWithNames: call.customer_name ? [{
              phone_number: call.phone_number,
              customer_name: call.customer_name
            }] : [],
            retryEnabled: true,
            retryIntervalMinutes: call.retry_interval_minutes,
            maxRetryAttempts: call.max_retry_attempts,
            isRetry: true,
            parentCallId: call.id,
            currentRetryCount: call.retry_count + 1
          }
        });

        if (callError) {
          console.error(`Error retrying call ${call.id}:`, callError);
          continue;
        }

        console.log(`✅ Successfully initiated retry for ${call.phone_number}`);
        totalRetriedCalls++;

        // Update the original call's last_retry_at and next_retry_at
        const nextRetryTime = new Date(Date.now() + call.retry_interval_minutes * 60 * 1000).toISOString();
        await supabaseAdmin
          .from('call_logs')
          .update({
            last_retry_at: new Date().toISOString(),
            next_retry_at: (call.retry_count + 1) < call.max_retry_attempts ? nextRetryTime : null
          })
          .eq('id', call.id);

      } catch (error) {
        console.error(`Error processing retry for call ${call.id}:`, error);
      }
    }

    console.log(`\n=== Retry processing completed ===`);
    console.log(`Total calls retried: ${totalRetriedCalls}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Auto-retry processing completed',
      retriedCalls: totalRetriedCalls
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in retry processing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(JSON.stringify({
      error: errorMessage,
      details: errorDetails
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
