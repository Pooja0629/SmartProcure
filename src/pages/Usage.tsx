import { useState, useEffect } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Package, Calendar, TrendingDown } from 'lucide-react';
import { LogUsageDialog } from '@/components/usage/LogUsageDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatINR } from '@/lib/currency';

export default function Usage() {
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const fetchUsageHistory = async () => {
    const { data, error } = await supabase
      .from('usage_history')
      .select('*, components(*)')
      .order('date', { ascending: false })
      .limit(100);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setUsageHistory(data || []);
    }
  };

  useEffect(() => {
    fetchUsageHistory();
  }, []);

  // Function to calculate component value based on primary supplier pricing
  const calculateComponentValue = async (componentId: string) => {
    // Get primary supplier price for this component
    const { data: componentSupplier } = await supabase
      .from('component_suppliers')
      .select('unit_price')
      .eq('component_id', componentId)
      .eq('is_primary', true)
      .single();

    return componentSupplier?.unit_price || 0;
  };

  const filteredUsage = usageHistory.filter(u => 
    u.components?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Navigation />
      
      <main className="flex-1 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Usage History
              </h1>
              <p className="text-muted-foreground">
                Track component consumption and usage patterns
              </p>
            </div>
            <LogUsageDialog onSuccess={fetchUsageHistory} />
          </div>
          
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search usage records..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredUsage.map((usage) => (
            <UsageCard 
              key={usage.id} 
              usage={usage} 
              onValueCalculate={calculateComponentValue}
            />
          ))}
        </div>

        {filteredUsage.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No usage records found</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Separate component to handle async value calculation
function UsageCard({ usage, onValueCalculate }: { usage: any; onValueCalculate: (componentId: string) => Promise<number> }) {
  const [unitPrice, setUnitPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUnitPrice = async () => {
      const price = await onValueCalculate(usage.component_id);
      setUnitPrice(price);
      setLoading(false);
    };

    fetchUnitPrice();
  }, [usage.component_id, onValueCalculate]);

  const totalValue = unitPrice ? unitPrice * usage.units_used : 0;

  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{usage.components?.name}</h3>
              <p className="text-muted-foreground">{usage.components?.category}</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <TrendingDown className="h-3 w-3" />
            {usage.units_used} units used
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-muted-foreground text-sm mb-1">Usage Date</p>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">
                {new Date(usage.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div>
            <p className="text-muted-foreground text-sm mb-1">Units Consumed</p>
            <p className="font-medium text-lg">{usage.units_used} units</p>
            <p className="text-sm text-muted-foreground">
              {loading ? (
                'Calculating value...'
              ) : unitPrice ? (
                `Value: ${formatINR(totalValue)}`
              ) : (
                'Price not available'
              )}
            </p>
          </div>
          
          <div>
            <p className="text-muted-foreground text-sm mb-1">Current Stock</p>
            <p className="font-medium">{usage.components?.current_stock} units</p>
            <p className="text-sm text-muted-foreground">
              Min threshold: {usage.components?.min_stock} units
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}