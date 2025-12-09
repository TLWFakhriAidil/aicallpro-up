import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/contexts/CustomAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const phoneConfigSchema = z.object({
  sip_proxy: z.string().default('sip1.alienvoip.com'),
  sip_proxy_sec: z.string().default('sip3.alienvoip.com'),
  sip_username: z.string().min(1, 'SIP Username diperlukan'),
  sip_password: z.string().min(1, 'SIP Password diperlukan'),
  sip_codec: z.string().default('G729'),
});

type PhoneConfigFormData = z.infer<typeof phoneConfigSchema>;

interface PhoneConfigData {
  sip_proxy: string;
  sip_proxy_sec: string;
  sip_username: string;
  sip_password: string;
  sip_codec: string;
}

export function PhoneConfigForm() {
  const { user } = useCustomAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PhoneConfigFormData>({
    resolver: zodResolver(phoneConfigSchema),
    defaultValues: {
      sip_proxy: 'sip1.alienvoip.com',
      sip_proxy_sec: 'sip3.alienvoip.com',
      sip_username: '',
      sip_password: '',
      sip_codec: 'G729',
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

  useEffect(() => {
    if (phoneConfig) {
      form.reset({
        sip_proxy: phoneConfig.sip_proxy || 'sip1.alienvoip.com',
        sip_proxy_sec: phoneConfig.sip_proxy_sec || 'sip3.alienvoip.com',
        sip_username: phoneConfig.sip_username || '',
        sip_password: phoneConfig.sip_password || '',
        sip_codec: phoneConfig.sip_codec || 'G729',
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
        sip_proxy: data.sip_proxy,
        sip_proxy_sec: data.sip_proxy_sec,
        sip_username: data.sip_username,
        sip_password: data.sip_password,
        sip_codec: data.sip_codec,
        provider: 'alienvoip',
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
        description: 'Konfigurasi SIP disimpan!',
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
          AlienVoip SIP Configuration
          <Badge variant={phoneConfig ? "default" : "secondary"}>
            {phoneConfig ? "Configured" : "Not Configured"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Configure kredensial SIP AlienVoip anda
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>AlienVoip SIP Trunking</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-sm">
              Sistem sekarang menggunakan AlienVoip SIP untuk panggilan keluar. Masukkan kredensial SIP anda di bawah.
            </p>
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="sip_proxy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SIP Proxy</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="sip1.alienvoip.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    SIP proxy server utama
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sip_proxy_sec"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SIP Proxy Secondary</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="sip3.alienvoip.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    SIP proxy server sandaran
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sip_username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SIP Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="646006395"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Username SIP AlienVoip anda
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sip_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SIP Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Masukkan SIP Password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Password SIP AlienVoip anda (disimpan dengan selamat)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sip_codec"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SIP Codec</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="G729"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Audio codec (G729/G723/gsm/ulaw)
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
