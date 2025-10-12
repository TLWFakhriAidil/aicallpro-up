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

    // Find all campaigns with retry enabled
    const { data: campaigns, error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('id, user_id, campaign_name, prompt_id, retry_interval_minutes, max_retry_attempts')
      .eq('retry_enabled', true);
    
    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('No campaigns with retry enabled');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No campaigns with retry enabled',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${campaigns.length} campaigns with retry enabled`);

    let totalRetriedCalls = 0;
    const now = new Date();

    for (const campaign of campaigns) {
      console.log(`\n=== Processing campaign: ${campaign.campaign_name} (${campaign.id}) ===`);
      
      // Find failed calls that need retry
      const { data: failedCalls, error: callsError } = await supabaseAdmin
        .from('call_logs')
        .select('id, phone_number, customer_name, retry_count, created_at, campaign_id')
        .eq('campaign_id', campaign.id)
        .neq('status', 'answered')
        .lt('retry_count', campaign.max_retry_attempts);

      if (callsError) {
        console.error(`Error fetching calls for campaign ${campaign.id}:`, callsError);
        continue;
      }

      if (!failedCalls || failedCalls.length === 0) {
        console.log(`No failed calls eligible for retry in campaign ${campaign.id}`);
        continue;
      }

      console.log(`Found ${failedCalls.length} failed calls to check for retry`);

      // Filter calls that are ready for retry (based on time interval)
      const callsToRetry = failedCalls.filter(call => {
        const callTime = new Date(call.created_at);
        const minutesSinceCall = (now.getTime() - callTime.getTime()) / (1000 * 60);
        const isReady = minutesSinceCall >= campaign.retry_interval_minutes;
        
        if (isReady) {
          console.log(`Call ${call.id} ready for retry - ${minutesSinceCall.toFixed(0)} minutes since last attempt`);
        }
        
        return isReady;
      });

      if (callsToRetry.length === 0) {
        console.log(`No calls ready for retry yet in campaign ${campaign.id}`);
        continue;
      }

      console.log(`${callsToRetry.length} calls ready for retry`);

      // Process each call individually
      for (const call of callsToRetry) {
        try {
          console.log(`Retrying call to ${call.phone_number} (attempt ${call.retry_count + 1}/${campaign.max_retry_attempts})`);
          
          // Use the batch-call function to make the retry call
          const { data: response, error: callError } = await supabaseAdmin.functions.invoke('batch-call', {
            body: {
              userId: campaign.user_id,
              campaignName: `${campaign.campaign_name} (Auto Retry ${call.retry_count + 1})`,
              promptId: campaign.prompt_id,
              phoneNumbers: [call.phone_number],
              phoneNumbersWithNames: call.customer_name ? [{
                phone_number: call.phone_number,
                customer_name: call.customer_name
              }] : [],
              retryEnabled: true,
              retryIntervalMinutes: campaign.retry_interval_minutes,
              maxRetryAttempts: campaign.max_retry_attempts,
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

        } catch (error) {
          console.error(`Error processing retry for call ${call.id}:`, error);
        }
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
