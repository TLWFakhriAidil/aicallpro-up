import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/contexts/CustomAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PhoneNumber {
  id: string;
  phone_number_id: string;
  agent_id: string;
  phone_number: string;
  created_at: string;
}

interface Agent {
  id: string;
  agent_id: string;
  name: string;
}

export function NumbersList() {
  const { user } = useCustomAuth();

  const { data: numbers, isLoading } = useQuery({
    queryKey: ['numbers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('numbers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PhoneNumber[];
    },
    enabled: !!user,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as Agent[];
    },
    enabled: !!user,
  });

  const getAgentName = (agentId: string) => {
    const agent = agents?.find(a => a.agent_id === agentId);
    return agent?.name || 'Unknown Agent';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Phone Numbers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Phone Numbers</CardTitle>
        <CardDescription>
          {numbers?.length || 0} number(s) configured
        </CardDescription>
      </CardHeader>
      <CardContent>
        {numbers && numbers.length > 0 ? (
          <div className="space-y-4">
            {numbers.map((number) => (
              <div key={number.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{number.phone_number}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        Agent: {getAgentName(number.agent_id)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(number.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs mt-1">
                    ID: {number.phone_number_id.slice(0, 8)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No phone numbers configured yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}