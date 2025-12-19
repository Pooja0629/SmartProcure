import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, TrendingDown, Star } from 'lucide-react';

interface ComponentSupplier {
  id: string;
  supplier_id: string;
  unit_price: number;
  lead_time_days: number;
  shelf_life_months: number;
  is_primary: boolean;
  suppliers: {
    id: string;
    name: string;
    email: string;
    rating: number;
  };
}

interface ManageSuppliersDialogProps {
  componentId: string;
  componentName: string;
  onSuccess: () => void;
}

export function ManageSuppliersDialog({ componentId, componentName, onSuccess }: ManageSuppliersDialogProps) {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [componentSuppliers, setComponentSuppliers] = useState<ComponentSupplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [leadTimes, setLeadTimes] = useState<Record<string, number>>({});
  const [shelfLives, setShelfLives] = useState<Record<string, number>>({});
  const [primarySupplier, setPrimarySupplier] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [suppliersRes, componentSuppliersRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase
          .from('component_suppliers')
          .select('*, suppliers(id, name, email, rating)')
          .eq('component_id', componentId)
      ]);

      if (suppliersRes.error) throw suppliersRes.error;
      if (componentSuppliersRes.error) throw componentSuppliersRes.error;

      setSuppliers(suppliersRes.data || []);
      setComponentSuppliers(componentSuppliersRes.data as ComponentSupplier[] || []);

      const selected = new Set((componentSuppliersRes.data || []).map((cs: any) => cs.supplier_id));
      setSelectedSuppliers(selected);

      const pricesMap: Record<string, number> = {};
      const leadTimesMap: Record<string, number> = {};
      const shelfLivesMap: Record<string, number> = {};
      let primary = '';

      (componentSuppliersRes.data || []).forEach((cs: any) => {
        pricesMap[cs.supplier_id] = cs.unit_price;
        leadTimesMap[cs.supplier_id] = cs.lead_time_days;
        // Convert months to years for display (divide by 12)
        shelfLivesMap[cs.supplier_id] = cs.shelf_life_months ? cs.shelf_life_months / 12 : 2;
        if (cs.is_primary) primary = cs.supplier_id;
      });

      setPrices(pricesMap);
      setLeadTimes(leadTimesMap);
      setShelfLives(shelfLivesMap);
      setPrimarySupplier(primary);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (selectedSuppliers.size === 0) {
      toast({ title: 'Error', description: 'Please select at least one supplier', variant: 'destructive' });
      return;
    }

    if (!primarySupplier && selectedSuppliers.size > 0) {
      toast({ title: 'Error', description: 'Please set a primary supplier', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const toDelete = componentSuppliers
        .filter(cs => !selectedSuppliers.has(cs.supplier_id))
        .map(cs => cs.id);

      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('component_suppliers')
          .delete()
          .in('id', toDelete);
        if (deleteError) throw deleteError;
      }

      const upsertData = Array.from(selectedSuppliers).map(supplierId => ({
        component_id: componentId,
        supplier_id: supplierId,
        unit_price: prices[supplierId] || 0,
        lead_time_days: leadTimes[supplierId] || 7,
        shelf_life_months: Math.round((shelfLives[supplierId] || 2) * 12), // Convert years to months for storage
        is_primary: supplierId === primarySupplier
      }));

      const { error: upsertError } = await supabase
        .from('component_suppliers')
        .upsert(upsertData, { onConflict: 'component_id,supplier_id' });

      if (upsertError) throw upsertError;

      toast({ title: 'Success', description: 'Supplier relationships updated' });
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleSupplier = (supplierId: string) => {
    const newSelected = new Set(selectedSuppliers);
    if (newSelected.has(supplierId)) {
      newSelected.delete(supplierId);
      if (primarySupplier === supplierId) {
        setPrimarySupplier('');
      }
    } else {
      newSelected.add(supplierId);
      if (!prices[supplierId]) setPrices(prev => ({ ...prev, [supplierId]: 0 }));
      if (!leadTimes[supplierId]) setLeadTimes(prev => ({ ...prev, [supplierId]: 7 }));
      if (!shelfLives[supplierId]) setShelfLives(prev => ({ ...prev, [supplierId]: 2 }));
    }
    setSelectedSuppliers(newSelected);
  };

  const getBestPrice = () => {
    const selected = Array.from(selectedSuppliers);
    if (selected.length === 0) return null;
    return Math.min(...selected.map(id => prices[id] || Infinity));
  };

  const bestPrice = getBestPrice();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Manage Suppliers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Suppliers for {componentName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select suppliers and configure pricing for this component. Set one as primary supplier.
          </p>

          {suppliers.map((supplier) => {
            const isSelected = selectedSuppliers.has(supplier.id);
            const isPrimary = primarySupplier === supplier.id;
            const price = prices[supplier.id] || 0;
            const isBestPrice = bestPrice !== null && price === bestPrice && price > 0;

            return (
              <div key={supplier.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSupplier(supplier.id)}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{supplier.name}</p>
                        {isPrimary && <Badge className="bg-primary">Primary</Badge>}
                        {isBestPrice && isSelected && (
                          <Badge className="bg-green-100 text-green-800">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Best Price
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {supplier.email}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Button
                      size="sm"
                      variant={isPrimary ? 'default' : 'outline'}
                      onClick={() => setPrimarySupplier(supplier.id)}
                    >
                      {isPrimary ? 'Primary' : 'Set as Primary'}
                    </Button>
                  )}
                </div>

                {isSelected && (
                  <div className="grid grid-cols-4 gap-3 ml-8">
                    <div>
                      <Label className="text-xs">Unit Price (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={prices[supplier.id] || 0}
                        onChange={(e) => setPrices(prev => ({ ...prev, [supplier.id]: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Lead Time (days)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={leadTimes[supplier.id] || 7}
                        onChange={(e) => setLeadTimes(prev => ({ ...prev, [supplier.id]: parseInt(e.target.value) || 7 }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Shelf Life (years)</Label>
                      <Input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={shelfLives[supplier.id] || 2}
                        onChange={(e) => setShelfLives(prev => ({ ...prev, [supplier.id]: parseFloat(e.target.value) || 2 }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Supplier Rating</Label>
                      <div className="flex items-center gap-1 p-2 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (supplier.rating || 0) 
                                  ? 'text-yellow-400 fill-yellow-400' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({supplier.rating || 0}/4)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}