import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save, ExternalLink } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/contexts/CustomAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const phoneConfigSchema = z.object({
  erp_webhook_url: z.string().optional(),
});

type PhoneConfigFormData = z.infer<typeof phoneConfigSchema>;

interface PhoneConfigData {
  erp_webhook_url: string | null;
}

export function PhoneConfigForm() {
  const { user } = useCustomAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PhoneConfigFormData>({
    resolver: zodResolver(phoneConfigSchema),
    defaultValues: {
      erp_webhook_url: '',
    },
  });

  const { data: phoneConfig, isLoading } = useQuery({
    queryKey: ['phoneConfig'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('phone_config')
        .select('*')
        .eq('user_id', session.session.user.id)
        .maybeSingle();

      if (error) throw error;
      return data as PhoneConfigData | null;
    },
  });

  const { data: apiKeys } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('api_keys')
        .select('phone_number_id')
        .eq('user_id', session.session.user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (phoneConfig) {
      form.reset({
        erp_webhook_url: phoneConfig.erp_webhook_url || '',
      });
    }
  }, [phoneConfig, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: PhoneConfigFormData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('Not authenticated');

      const { data: existingConfig } = await supabase
        .from('phone_config')
        .select('id')
        .eq('user_id', session.session.user.id)
        .maybeSingle();

      const configData = {
        user_id: session.session.user.id,
        erp_webhook_url: data.erp_webhook_url || null,
        provider: 'twilio',
        updated_at: new Date().toISOString(),
      };

      if (existingConfig) {
        const { error } = await supabase
          .from('phone_config')
          .update(configData)
          .eq('user_id', session.session.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('phone_config')
          .insert(configData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Berjaya',
        description: 'Konfigurasi telefon disimpan!',
      });
      queryClient.invalidateQueries({ queryKey: ['phoneConfig'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ralat',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PhoneConfigFormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Twilio Phone Configuration
          <Badge variant={apiKeys?.phone_number_id ? "default" : "secondary"}>
            {apiKeys?.phone_number_id ? "Configured" : "Not Configured"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Konfigurasi nombor telefon Twilio anda untuk panggilan keluar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Twilio Phone Number</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-sm">
              Nombor telefon Twilio dikonfigurasi dalam halaman API Keys. Pastikan anda telah memasukkan Phone Number ID dari Twilio.
            </p>
            <Link to="/api-keys" className="inline-flex items-center text-sm text-primary hover:underline">
              <ExternalLink className="mr-1 h-3 w-3" />
              Pergi ke API Keys
            </Link>
          </AlertDescription>
        </Alert>

        {apiKeys?.phone_number_id && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Phone Number ID:</p>
            <p className="text-sm text-muted-foreground font-mono">{apiKeys.phone_number_id}</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="erp_webhook_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ERP Webhook URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://your-erp.com/webhook"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL webhook untuk menghantar data panggilan ke sistem ERP anda
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="w-full"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Simpan Konfigurasi
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
