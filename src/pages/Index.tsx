import { useState, useEffect } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  ShoppingCart,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/currency';

const Index = () => {
  const [metrics, setMetrics] = useState({
    total_components: 0,
    low_stock_alerts: 0,
    critical_components: 0,
    pending_orders: 0,
    total_inventory_value: 0,
    avg_lead_time: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Fetch components WITH supplier pricing
      const { data: components, error: componentsError } = await supabase
        .from('components')
        .select(`
          *,
          component_suppliers(
            unit_price,
            lead_time_days,
            is_primary
          )
        `);
      
      if (componentsError) throw componentsError;

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*');
      
      if (ordersError) throw ordersError;

      if (components) {
        // ✅ CORRECTED: Critical = Below minimum stock (even by 1 unit)
        const critical = components.filter(c => c.current_stock < c.min_stock);
        
        // ✅ CORRECTED: Low Stock = At or above minimum, but within 10% buffer
        const lowStock = components.filter(c => 
          c.current_stock >= c.min_stock && c.current_stock <= c.min_stock * 1.10
        );
        
        // Calculate total value using PRIMARY SUPPLIER pricing
        const totalValue = components.reduce((sum, component) => {
          const primarySupplier = component.component_suppliers?.find((cs: any) => cs.is_primary);
          const price = primarySupplier?.unit_price || 0;
          return sum + (component.current_stock * price);
        }, 0);
        
        // Calculate average lead time from PRIMARY SUPPLIERS
        const componentsWithLeadTimes = components.filter(component => {
          const primarySupplier = component.component_suppliers?.find((cs: any) => cs.is_primary);
          return primarySupplier?.lead_time_days || component.lead_time_days;
        });

        const avgLead = componentsWithLeadTimes.length > 0 
          ? componentsWithLeadTimes.reduce((sum, component) => {
              const primarySupplier = component.component_suppliers?.find((cs: any) => cs.is_primary);
              return sum + (primarySupplier?.lead_time_days || component.lead_time_days || 0);
            }, 0) / componentsWithLeadTimes.length
          : 0;

        setMetrics({
          total_components: components.length,
          low_stock_alerts: lowStock.length,
          critical_components: critical.length,
          pending_orders: orders?.filter(o => o.status === 'pending' || o.status === 'confirmed').length || 0,
          total_inventory_value: totalValue,
          avg_lead_time: Math.round(avgLead * 10) / 10, // Round to 1 decimal
        });
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Navigation />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navigation />
      
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Inventory Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor your electronics manufacturing inventory in real-time
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Total Components"
            value={metrics.total_components}
            icon={Package}
            variant="default"
          />
          <MetricCard
            title="Low Stock Alerts"
            value={metrics.low_stock_alerts}
            icon={AlertTriangle}
            variant={metrics.low_stock_alerts > 0 ? "warning" : "default"}
          />
          <MetricCard
            title="Critical Components"
            value={metrics.critical_components}
            icon={TrendingUp}
            variant={metrics.critical_components > 0 ? "critical" : "success"}
          />
          <MetricCard
            title="Pending Orders"
            value={metrics.pending_orders}
            icon={ShoppingCart}
            variant="default"
          />
          <MetricCard
            title="Inventory Value"
            value={formatINR(metrics.total_inventory_value)}
            icon={Package}
            variant="success"
          />
          <MetricCard
            title="Avg Lead Time"
            value={`${metrics.avg_lead_time} days`}
            icon={Clock}
            variant="default"
          />
        </div>

        {/* Alerts Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AlertsPanel />
          
          <div className="bg-card rounded-lg border border-border p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Database Connected</p>
                  <p className="text-xs text-muted-foreground">All systems operational</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Real-time Updates Active</p>
                  <p className="text-xs text-muted-foreground">Monitoring {metrics.total_components} components</p>
                </div>
              </div>
              {metrics.low_stock_alerts > 0 && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{metrics.low_stock_alerts} Low Stock Alert(s)</p>
                    <p className="text-xs text-muted-foreground">Review components page</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;