import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/contexts/CustomAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Search } from 'lucide-react';
import { CampaignBatchDetail } from './CampaignBatchDetail';

interface CampaignGroup {
  campaign_name: string;
  total_batches: number;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  latest_created_at: string;
}

export function CampaignBatchList() {
  const { user } = useCustomAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaignName, setSelectedCampaignName] = useState<string | null>(null);

  // Fetch grouped campaigns
  const { data: campaignGroups, isLoading } = useQuery({
    queryKey: ['campaign-groups', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('campaigns')
        .select('campaign_name, total_numbers, successful_calls, failed_calls, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by campaign_name
      const grouped = data.reduce((acc, campaign) => {
        const name = campaign.campaign_name;
        if (!acc[name]) {
          acc[name] = {
            campaign_name: name,
            total_batches: 0,
            total_calls: 0,
            successful_calls: 0,
            failed_calls: 0,
            latest_created_at: campaign.created_at,
          };
        }
        acc[name].total_batches += 1;
        acc[name].total_calls += campaign.total_numbers || 0;
        acc[name].successful_calls += campaign.successful_calls || 0;
        acc[name].failed_calls += campaign.failed_calls || 0;
        
        // Keep the latest date
        if (new Date(campaign.created_at) > new Date(acc[name].latest_created_at)) {
          acc[name].latest_created_at = campaign.created_at;
        }
        
        return acc;
      }, {} as Record<string, CampaignGroup>);

      return Object.values(grouped);
    },
    enabled: !!user,
  });

  // Filter campaigns based on search
  const filteredGroups = campaignGroups?.filter((group) =>
    group.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedCampaignName) {
    return (
      <CampaignBatchDetail
        campaignName={selectedCampaignName}
        onBack={() => setSelectedCampaignName(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama kempen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Campaign Groups List */}
      <Card>
        <CardHeader>
          <CardTitle>Senarai Kempen (Dikumpul mengikut Nama)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-96" />
                  </div>
                  <Skeleton className="h-10 w-20" />
                </div>
              ))}
            </div>
          ) : !filteredGroups || filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Tiada kempen dijumpai' : 'Belum ada kempen'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map((group) => {
                const successRate = group.total_calls > 0
                  ? ((group.successful_calls / group.total_calls) * 100).toFixed(1)
                  : '0.0';

                return (
                  <div
                    key={group.campaign_name}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground">
                        {group.campaign_name}
                      </h3>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <span>
                          <strong className="text-foreground">{group.total_batches}</strong> batch
                        </span>
                        <span>
                          <strong className="text-foreground">{group.total_calls}</strong> jumlah panggilan
                        </span>
                        <span>
                          <strong className="text-green-600">{group.successful_calls}</strong> berjaya
                        </span>
                        <span>
                          <strong className="text-red-600">{group.failed_calls}</strong> gagal
                        </span>
                        <span>
                          Success Rate: <strong className="text-foreground">{successRate}%</strong>
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Kemaskini terakhir: {new Date(group.latest_created_at).toLocaleDateString('ms-MY', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <Button
                      onClick={() => setSelectedCampaignName(group.campaign_name)}
                      size="sm"
                      className="ml-4"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
