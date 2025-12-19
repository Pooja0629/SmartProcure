import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Component } from '@/types/inventory';

export function AlertsPanel() {
  const [components, setComponents] = useState<Component[]>([]);

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    const { data } = await supabase.from('components').select('*');
    if (data) setComponents(data as Component[]);
  };

  // ✅ CORRECTED CALCULATION:
  const criticalComponents = components.filter(
    (component) => component.current_stock < component.min_stock
  );
  
  const lowStockComponents = components.filter(
    (component) => component.current_stock >= component.min_stock && component.current_stock <= component.min_stock * 1.10
  );

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Inventory Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {criticalComponents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="destructive" className="gap-1">
                <TrendingDown className="h-3 w-3" />
                Critical Stock
              </Badge>
              <span className="text-sm text-muted-foreground">
                {criticalComponents.length} components
              </span>
            </div>
            <div className="space-y-2">
              {criticalComponents.slice(0, 3).map((component) => (
                <div key={component.id} className="flex items-center justify-between p-2 bg-critical/10 rounded-lg border border-critical/20">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-critical" />
                    <div>
                      <p className="font-medium text-sm">{component.name}</p>
                      <p className="text-xs text-muted-foreground">{component.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-critical">
                      {component.current_stock} units
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Min: {component.min_stock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lowStockComponents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="gap-1 bg-warning/10 text-warning border-warning/20">
                <AlertTriangle className="h-3 w-3" />
                Low Stock
              </Badge>
              <span className="text-sm text-muted-foreground">
                {lowStockComponents.length} components
              </span>
            </div>
            <div className="space-y-2">
              {lowStockComponents.slice(0, 2).map((component) => (
                <div key={component.id} className="flex items-center justify-between p-2 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-warning" />
                    <div>
                      <p className="font-medium text-sm">{component.name}</p>
                      <p className="text-xs text-muted-foreground">{component.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-warning">
                      {component.current_stock} units
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Min: {component.min_stock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {criticalComponents.length === 0 && lowStockComponents.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All components are well stocked</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}