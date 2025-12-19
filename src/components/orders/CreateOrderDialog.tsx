import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, AlertTriangle, Info, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatINR } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';

export function CreateOrderDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [components, setComponents] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [componentSuppliers, setComponentSuppliers] = useState<any[]>([]);
  const [selectedComponent, setSelectedComponent] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<string>('');
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchComponents();
      fetchSuppliers();
    }
  }, [open]);

  useEffect(() => {
    if (selectedComponent) {
      fetchComponentSuppliers(selectedComponent);
    } else {
      setComponentSuppliers([]);
      setSelectedSupplier('');
      setUnitPrice(0);
      setQuantity('');
    }
  }, [selectedComponent]);

  useEffect(() => {
    if (selectedSupplier && selectedComponent) {
      const supplierPrice = componentSuppliers.find(
        cs => cs.supplier_id === selectedSupplier && cs.component_id === selectedComponent
      )?.unit_price;
      setUnitPrice(supplierPrice || 0);
    } else {
      setUnitPrice(0);
    }
  }, [selectedSupplier, selectedComponent, componentSuppliers]);

  const fetchComponents = async () => {
    const { data } = await supabase.from('components').select('*');
    if (data) setComponents(data);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*');
    if (data) setSuppliers(data);
  };

  const fetchComponentSuppliers = async (componentId: string) => {
    const { data } = await supabase
      .from('component_suppliers')
      .select('*, suppliers(*)')
      .eq('component_id', componentId);
    
    if (data) {
      setComponentSuppliers(data);
      // Auto-select primary supplier if available
      const primarySupplier = data.find((cs: any) => cs.is_primary);
      if (primarySupplier) {
        setSelectedSupplier(primarySupplier.supplier_id);
      }
    }
  };

  const getStockStatus = (component: any) => {
    const { current_stock, min_stock } = component;
    
    // ✅ CORRECT LOGIC:
    if (current_stock < min_stock) {
      return { status: 'critical', label: 'Critical Stock' };
    } else if (current_stock <= min_stock * 1.10) {
      return { status: 'low', label: 'Low Stock' };
    } else {
      return { status: 'healthy', label: 'Healthy' };
    }
  };

  // 🚀 ENHANCED SMART QUANTITY CALCULATION
  const calculateSmartQuantity = async () => {
    if (!selectedComponent) return;
    
    setCalculating(true);
    const component = components.find(c => c.id === selectedComponent);
    if (!component) return;

    const { current_stock, min_stock, id } = component;
    
    try {
      // ✅ GET LEAD TIME FROM PRIMARY SUPPLIER
      let leadTimeDays = 7; // Default fallback
      
      const { data: primarySupplier } = await supabase
        .from('component_suppliers')
        .select('lead_time_days')
        .eq('component_id', selectedComponent)
        .eq('is_primary', true)
        .single();
      
      if (primarySupplier?.lead_time_days) {
        leadTimeDays = primarySupplier.lead_time_days;
      }

      // Fetch last 6 months of completed orders for consumption analysis
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: orderHistory, error } = await supabase
        .from('orders')
        .select('quantity, order_date, status')
        .eq('component_id', id)
        .eq('status', 'completed')
        .gte('order_date', sixMonthsAgo.toISOString().split('T')[0])
        .order('order_date', { ascending: false });

      if (error) throw error;

      let suggestedQty;

      if (orderHistory && orderHistory.length > 0) {
        // 🎯 SMART CALCULATION BASED ON USAGE HISTORY
        const totalOrdered = orderHistory.reduce((sum: number, order: any) => sum + order.quantity, 0);
        
        // Calculate average monthly consumption
        const oldestOrder = new Date(orderHistory[orderHistory.length - 1].order_date);
        const newestOrder = new Date(orderHistory[0].order_date);
        const daysDiff = (newestOrder.getTime() - oldestOrder.getTime()) / (1000 * 60 * 60 * 24);
        const monthsDiff = Math.max(daysDiff / 30, 1); // At least 1 month
        
        const avgMonthlyConsumption = Math.ceil(totalOrdered / monthsDiff);
        
        // Calculate safety stock based on primary supplier's lead time
        const dailyConsumption = avgMonthlyConsumption / 30;
        const safetyStock = Math.ceil(dailyConsumption * leadTimeDays * 1.5); // 50% buffer
        
        // Calculate recommended quantity
        const recommendedStock = Math.max(min_stock, avgMonthlyConsumption) + safetyStock;
        suggestedQty = Math.max(recommendedStock - current_stock, min_stock);
        
        console.log(`Smart Calculation for ${component.name}:`, {
          primarySupplierLeadTime: leadTimeDays,
          avgMonthlyConsumption,
          dailyConsumption: dailyConsumption.toFixed(2),
          safetyStock,
          recommendedStock,
          currentStock: current_stock,
          suggestedQty
        });
        
      } else {
        // 🆕 NEW ITEM: Use enhanced calculation with lead time
        const dailyConsumption = min_stock / 30; // Estimate based on min stock
        const safetyStock = Math.ceil(dailyConsumption * leadTimeDays);
        const healthyLevel = Math.ceil(min_stock * 1.10) + safetyStock;
        suggestedQty = Math.max(healthyLevel - current_stock, min_stock);
        
        console.log(`New Item Calculation for ${component.name}:`, {
          leadTimeDays,
          safetyStock,
          healthyLevel,
          suggestedQty
        });
      }

      setQuantity(suggestedQty.toString());
      
      toast({
        title: 'Smart Quantity Calculated',
        description: `Based on usage history and ${leadTimeDays} day lead time`,
        variant: 'default'
      });
      
    } catch (error) {
      console.error('Error calculating smart quantity:', error);
      // Fallback to basic calculation
      const healthyLevel = Math.ceil(min_stock * 1.10);
      const basicQty = Math.max(healthyLevel - current_stock, min_stock);
      setQuantity(basicQty.toString());
      
      toast({
        title: 'Using Basic Calculation',
        description: 'Could not fetch historical data',
        variant: 'default'
      });
    } finally {
      setCalculating(false);
    }
  };

  // 🆕 FUNCTION TO GENERATE SEQUENTIAL ORDER NUMBER
  const generateOrderNumber = async (): Promise<string> => {
    try {
      // Get the latest order to determine the next number
      const { data: latestOrder, error } = await supabase
        .from('orders')
        .select('order_number')
        .not('order_number', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error('Error fetching latest order:', error);
        throw error;
      }

      let nextNumber = 1;
      
      if (latestOrder?.order_number) {
        // Extract number from format like "0001" or "ORD-0001"
        const match = latestOrder.order_number.match(/\d+/);
        if (match) {
          nextNumber = parseInt(match[0]) + 1;
        }
      }

      // Format as 4-digit number with leading zeros
      return nextNumber.toString().padStart(4, '0');
      
    } catch (error) {
      console.error('Error generating order number:', error);
      // Fallback: use timestamp-based number
      return Date.now().toString().slice(-4);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const quantity = parseInt(formData.get('quantity') as string);

    try {
      // 🆕 Generate sequential order number
      const orderNumber = await generateOrderNumber();

      const data = {
        component_id: selectedComponent,
        supplier_id: selectedSupplier,
        quantity: quantity,
        unit_price: unitPrice,
        status: 'pending',
        order_date: new Date().toISOString().split('T')[0],
        order_number: orderNumber, // 🆕 Add sequential order number
      };

      const { error } = await supabase.from('orders').insert([data]);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ 
          title: 'Success', 
          description: `Order #${orderNumber} created successfully` 
        });
        setOpen(false);
        setSelectedComponent('');
        setSelectedSupplier('');
        setUnitPrice(0);
        setQuantity('');
        onSuccess();
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create order', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSuppliers = () => {
    if (!selectedComponent) return suppliers;
    
    const availableSupplierIds = componentSuppliers.map(cs => cs.supplier_id);
    return suppliers.filter(s => availableSupplierIds.includes(s.id));
  };

  const selectedComponentData = components.find(c => c.id === selectedComponent);
  const stockStatus = selectedComponentData ? getStockStatus(selectedComponentData) : null;

  // Get primary supplier lead time for display
  const primarySupplierLeadTime = componentSuppliers.find(cs => cs.is_primary)?.lead_time_days;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Component *</Label>
            <Select value={selectedComponent} onValueChange={setSelectedComponent} required>
              <SelectTrigger>
                <SelectValue placeholder="Select component" />
              </SelectTrigger>
              <SelectContent>
                {components.map((c) => {
                  const status = getStockStatus(c);
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{c.name}</span>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-sm text-muted-foreground">
                            Stock: {c.current_stock}
                          </span>
                          <Badge 
                            variant={
                              status.status === 'critical' ? 'destructive' : 
                              status.status === 'low' ? 'secondary' : 'default'
                            }
                            className="text-xs"
                          >
                            {status.status === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {status.status === 'low' && <Info className="w-3 h-3 mr-1" />}
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedComponentData && stockStatus && (
            <div className={`p-3 rounded-lg border ${
              stockStatus.status === 'critical' ? 'bg-red-50 border-red-200' :
              stockStatus.status === 'low' ? 'bg-amber-50 border-amber-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-2">
                {stockStatus.status === 'critical' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                {stockStatus.status === 'low' && <Info className="w-4 h-4 text-amber-600" />}
                <span className={`text-sm font-medium ${
                  stockStatus.status === 'critical' ? 'text-red-800' :
                  stockStatus.status === 'low' ? 'text-amber-800' :
                  'text-green-800'
                }`}>
                  {stockStatus.label}
                </span>
              </div>
              <p className={`text-xs mt-1 ${
                stockStatus.status === 'critical' ? 'text-red-700' :
                stockStatus.status === 'low' ? 'text-amber-700' :
                'text-green-700'
              }`}>
                Current: {selectedComponentData.current_stock} units | 
                Minimum: {selectedComponentData.min_stock} units
                {primarySupplierLeadTime && ` | Lead Time: ${primarySupplierLeadTime} days`}
              </p>
            </div>
          )}

          {selectedComponent && (
            <div>
              <Label>Supplier *</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSuppliers().map((s) => {
                    const componentSupplier = componentSuppliers.find(
                      cs => cs.supplier_id === s.id
                    );
                    
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-2">
                            <span>{s.name}</span>
                            {componentSupplier?.is_primary && (
                              <Badge variant="secondary" className="text-xs">Primary</Badge>
                            )}
                          </div>
                          {componentSupplier?.unit_price && (
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {formatINR(componentSupplier.unit_price)}
                              </div>
                              {componentSupplier.lead_time_days && (
                                <div className="text-xs text-muted-foreground">
                                  {componentSupplier.lead_time_days}d lead
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {componentSuppliers.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  No suppliers available for this component
                </p>
              )}
            </div>
          )}

          {selectedSupplier && unitPrice > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Supplier Price: {formatINR(unitPrice)} per unit</p>
              {primarySupplierLeadTime && (
                <p className="text-sm text-muted-foreground mt-1">
                  Lead Time: {primarySupplierLeadTime} days
                </p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="quantity">Quantity *</Label>
              {selectedComponentData && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={calculateSmartQuantity}
                  disabled={calculating}
                  className="gap-1"
                >
                  <Calculator className="h-3 w-3" />
                  {calculating ? 'Calculating...' : 'Smart Suggest'}
                </Button>
              )}
            </div>
            <Input 
              id="quantity" 
              name="quantity" 
              type="number" 
              min="1" 
              required 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
            {selectedComponentData && quantity && (
              <p className="text-xs text-muted-foreground mt-1">
                This will bring stock to {selectedComponentData.current_stock + parseInt(quantity)} units
                {selectedComponentData.current_stock + parseInt(quantity) >= Math.ceil(selectedComponentData.min_stock * 1.10) 
                  ? ' (Healthy Level ✓)' 
                  : ' (Still below healthy level)'}
              </p>
            )}
          </div>

          {selectedSupplier && unitPrice > 0 && quantity && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium text-primary">
                Total Order Value: {formatINR(unitPrice * (parseInt(quantity) || 0))}
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !selectedComponent || !selectedSupplier || unitPrice === 0 || !quantity}
          >
            {loading ? 'Creating...' : 'Create Order'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}