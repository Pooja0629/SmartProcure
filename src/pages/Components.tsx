import { useState, useEffect } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Package, Star } from 'lucide-react';
import { Component } from '@/types/inventory';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatINR } from '@/lib/currency';
import { AddComponentDialog } from '@/components/components/AddComponentDialog';
import { EditComponentDialog } from '@/components/components/EditComponentDialog';
import { ManageSuppliersDialog } from '@/components/suppliers/ManageSuppliersDialog';

const getStockStatus = (component: Component) => {
  if (component.current_stock < component.min_stock) {
    return { label: 'Critical', variant: 'destructive' as const };
  } else if (component.current_stock <= component.min_stock * 1.10) {
    return { label: 'Low Stock', variant: 'secondary' as const };
  }
  return { label: 'In Stock', variant: 'default' as const };
};

export default function Components() {
  const [components, setComponents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const fetchComponents = async () => {
    const { data, error } = await supabase
      .from('components')
      .select(`
        *,
        component_suppliers(
          id,
          unit_price,
          lead_time_days,
          is_primary,
          suppliers(id, name, rating)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setComponents(data || []);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete component "${name}"? This action cannot be undone.`)) return;

    const { error } = await supabase.from('components').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Component removed successfully' });
      fetchComponents();
    }
  };

  const filteredComponents = components.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Navigation />
      
      <main className="flex-1 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Component Management
              </h1>
              <p className="text-muted-foreground">
                Manage your electronics components inventory
              </p>
            </div>
            <AddComponentDialog onSuccess={fetchComponents} />
          </div>
          
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search components..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredComponents.map((component) => {
            const status = getStockStatus(component);
            return (
              <Card key={component.id} className="shadow-card hover:shadow-elevated transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{component.name}</CardTitle>
                    </div>
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{component.category}</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Current Stock</p>
                      <p className="font-semibold">{component.current_stock} units</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min Stock</p>
                      <p className="font-semibold">{component.min_stock} units</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm font-medium">Supplier Options</p>
                    {component.component_suppliers && component.component_suppliers.length > 0 ? (
                      <div className="space-y-2">
                        {component.component_suppliers.map((cs: any) => (
                          <div 
                            key={cs.id} 
                            className={`p-2 rounded-md text-xs ${cs.is_primary ? 'bg-primary/10 border border-primary/20' : 'bg-muted'}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{cs.suppliers.name}</span>
                              {cs.is_primary && <Badge className="h-4 text-[10px]">Primary</Badge>}
                            </div>
                            
                            {/* Supplier Rating Display */}
                            <div className="flex items-center gap-1 mb-1">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3 w-3 ${
                                      star <= (cs.suppliers.rating || 0) 
                                        ? 'text-yellow-400 fill-yellow-400' 
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                ({cs.suppliers.rating || 0}/4)
                              </span>
                            </div>

                            <div className="flex gap-2 text-muted-foreground">
                              <span>{formatINR(cs.unit_price)}</span>
                              <span>•</span>
                              <span>{cs.lead_time_days}d lead</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No suppliers configured</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <ManageSuppliersDialog 
                      componentId={component.id}
                      componentName={component.name}
                      onSuccess={fetchComponents}
                    />
                    <EditComponentDialog component={component} onSuccess={fetchComponents} />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(component.id, component.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredComponents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No components found</p>
          </div>
        )}
      </main>
    </div>
  );
}