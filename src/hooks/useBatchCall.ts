import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/contexts/CustomAuthContext";
import { toast } from "sonner";
import { canMakeCalls } from "@/lib/billing";

const batchCallSchema = z.object({
  campaignName: z.string().min(1, "Nama kempen diperlukan"),
  promptId: z.string().min(1, "Sila pilih prompt"),
  phoneNumbers: z.string().min(1, "Senarai nombor telefon diperlukan"),
  retryEnabled: z.boolean().default(false),
  retryIntervalMinutes: z.number().min(5).max(1440).default(30),
  maxRetryAttempts: z.number().min(1).max(10).default(3),
});

type BatchCallFormData = z.infer<typeof batchCallSchema>;

interface UseBatchCallOptions {
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  predefinedNumbers?: string[];
}

export function useBatchCall(options: UseBatchCallOptions = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCampaign, setLastCampaign] = useState<any>(null);
  const [validNumbers, setValidNumbers] = useState<string[]>([]);
  const [invalidNumbers, setInvalidNumbers] = useState<string[]>([]);
  const { user } = useCustomAuth();

  const form = useForm<BatchCallFormData>({
    resolver: zodResolver(batchCallSchema),
    defaultValues: {
      campaignName: "",
      promptId: "",
      phoneNumbers: "",
      retryEnabled: false,
      retryIntervalMinutes: 30,
      maxRetryAttempts: 3,
    },
  });

  // Fetch available prompts
  const { data: prompts, isLoading: promptsLoading } = useQuery({
    queryKey: ["prompts", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch last campaign for repeat functionality with call logs
  const { data: lastCampaignData } = useQuery({
    queryKey: ["last-campaign", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      // Get the last campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, campaign_name, prompt_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (campaignError) throw campaignError;
      
      if (!campaign?.[0]) return null;

      // Get phone numbers from call logs of the last campaign
      const { data: callLogs, error: callLogsError } = await supabase
        .from('call_logs')
        .select('phone_number')
        .eq('campaign_id', campaign[0].id)
        .order('created_at', { ascending: false });

      if (callLogsError) throw callLogsError;

      const phoneNumbers = callLogs?.map(log => log.phone_number).join('\n') || '';

      return {
        ...campaign[0],
        phoneNumbers
      };
    },
    enabled: !!user,
  });

  // Auto-select first prompt if available
  useEffect(() => {
    if (prompts && prompts.length > 0 && !form.getValues('promptId')) {
      form.setValue('promptId', prompts[0].id);
    }
  }, [prompts, form]);

  // Set predefined numbers if provided
  useEffect(() => {
    if (options.predefinedNumbers && options.predefinedNumbers.length > 0) {
      const numbersString = options.predefinedNumbers.join('\n');
      form.setValue('phoneNumbers', numbersString);
    }
  }, [options.predefinedNumbers, form]);

  // Validate phone numbers in real-time
  useEffect(() => {
    const phoneNumbers = form.watch("phoneNumbers");
    if (phoneNumbers) {
      const numbers = phoneNumbers
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      const valid: string[] = [];
      const invalid: string[] = [];
      
      numbers.forEach(number => {
        // Basic Malaysian phone number validation
        const cleanNumber = number.replace(/\D/g, '');
        if (cleanNumber.length >= 9 && cleanNumber.length <= 15) {
          valid.push(number);
        } else {
          invalid.push(number);
        }
      });
      
      setValidNumbers(valid);
      setInvalidNumbers(invalid);
    } else {
      setValidNumbers([]);
      setInvalidNumbers([]);
    }
  }, [form.watch("phoneNumbers")]);

  const batchCallMutation = useMutation({
    mutationFn: async (data: BatchCallFormData) => {
      // Check subscription status first
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const hasAccess = await canMakeCalls(user.id);
      if (!hasAccess) {
        throw new Error("Your trial has expired. Please upgrade to Pro to continue making calls.");
      }

      if (validNumbers.length === 0) {
        throw new Error("Tiada nombor telefon yang sah");
      }

      if (invalidNumbers.length > 0) {
        toast.warning(`${invalidNumbers.length} nombor tidak sah akan diabaikan`);
      }

      // Call the batch-call edge function with custom auth token
      const customAuthToken = localStorage.getItem('customAuthToken');
      if (!customAuthToken) {
        throw new Error("Anda perlu log masuk semula");
      }

      const { data: response, error } = await supabase.functions.invoke('batch-call', {
        headers: {
          'Authorization': `Bearer ${customAuthToken}`
        },
        body: {
          campaignName: data.campaignName,
          promptId: data.promptId,
          phoneNumbers: validNumbers,
          concurrentLimit: 10, // Fixed default value
          retryEnabled: data.retryEnabled,
          retryIntervalMinutes: data.retryIntervalMinutes,
          maxRetryAttempts: data.maxRetryAttempts,
        }
      });

      if (error) throw error;
      return response;
    },
    onSuccess: (response) => {
      toast.success(`🎉 Kempen batch call berjaya dimulakan! 
        ✅ Berjaya: ${response.summary.successful_calls}, 
        ❌ Gagal: ${response.summary.failed_calls}`);
      
      // Save this campaign for repeat functionality
      setLastCampaign({
        campaignName: form.getValues('campaignName'),
        promptId: form.getValues('promptId'),
        phoneNumbers: validNumbers.join('\n')
      });
      
      form.reset();
      setValidNumbers([]);
      setInvalidNumbers([]);

      // Call custom success handler if provided
      if (options.onSuccess) {
        options.onSuccess(response);
      }
    },
    onError: (error: any) => {
      toast.error("Gagal memulakan kempen: " + error.message);
      
      // Call custom error handler if provided
      if (options.onError) {
        options.onError(error);
      }
    },
  });

  const onSubmit = (data: BatchCallFormData) => {
    if (invalidNumbers.length > 0) {
      toast.error(`Terdapat ${invalidNumbers.length} nombor tidak sah. Sila betulkan sebelum meneruskan.`);
      return;
    }
    setIsSubmitting(true);
    batchCallMutation.mutate(data);
    setIsSubmitting(false);
  };

  const handleRepeatLast = () => {
    if (lastCampaignData) {
      form.setValue('campaignName', `${lastCampaignData.campaign_name} (Repeat)`);
      form.setValue('promptId', lastCampaignData.prompt_id);
      form.setValue('phoneNumbers', lastCampaignData.phoneNumbers || '');
      
      toast.success("Kempen terakhir beserta nombor telefon telah dimuatkan!");
    } else {
      toast.error("Tiada kempen terakhir dijumpai");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        form.setValue('phoneNumbers', content);
      };
      reader.readAsText(file);
    }
  };

  return {
    form,
    prompts,
    promptsLoading,
    lastCampaignData,
    validNumbers,
    invalidNumbers,
    isSubmitting,
    batchCallMutation,
    onSubmit,
    handleRepeatLast,
    handleFileUpload,
  };
}