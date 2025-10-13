import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";

export interface CampaignBatchListFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  stage: string;
}

interface CampaignBatchListFiltersProps {
  filters: CampaignBatchListFilters;
  onFiltersChange: (filters: CampaignBatchListFilters) => void;
  totalCount?: number;
  filteredCount?: number;
}

export function CampaignBatchListFilters({ 
  filters, 
  onFiltersChange, 
  totalCount = 0, 
  filteredCount = 0
}: CampaignBatchListFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof CampaignBatchListFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'latest_created_at',
      sortOrder: 'desc',
      stage: ''
    });
  };

  const hasActiveFilters = filters.search || 
    filters.dateFrom || 
    filters.dateTo ||
    filters.stage;

  const activeFiltersCount = [
    filters.search,
    filters.dateFrom || filters.dateTo,
    filters.stage
  ].filter(Boolean).length;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Search and Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama kempen..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Results Summary */}
        {(hasActiveFilters || totalCount > 0) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground pt-2 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span>
                {hasActiveFilters ? (
                  <>Showing {filteredCount} of {totalCount} campaign groups</>
                ) : (
                  <>Total: {totalCount} campaign groups</>
                )}
              </span>
            </div>
            
            {hasActiveFilters && (
              <Button variant="link" size="sm" onClick={clearFilters} className="h-auto p-0">
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
