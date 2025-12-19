import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useInventoryMonitor } from '@/hooks/useInventoryMonitor';

export function LogUsageDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [components, setComponents] = useState<any[]>([]);
  const [selectedComponent, setSelectedComponent] = useState('');
  const { toast } = useToast();
  const { checkAndAlertSuppliers } = useInventoryMonitor();

  useEffect(() => {
    if (open) {
      fetchComponents();
    }
  }, [open]);

  const fetchComponents = async () => {
    const { data } = await supabase.from('components').select('*');
    if (data) setComponents(data);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const unitsUsed = parseInt(formData.get('units_used') as string);
    const date = formData.get('date') as string;

    // Insert usage record
    const { error: usageError } = await supabase.from('usage_history').insert([{
      component_id: selectedComponent,
      units_used: unitsUsed,
      date,
    }]);

    if (usageError) {
      toast({ title: 'Error', description: usageError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Update component stock
    const component = components.find(c => c.id === selectedComponent);
    const { error: updateError } = await supabase
      .from('components')
      .update({ current_stock: component.current_stock - unitsUsed })
      .eq('id', selectedComponent);

    setLoading(false);

    if (updateError) {
      toast({ title: 'Warning', description: 'Usage logged but stock update failed', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Usage logged and stock updated' });
      
      // Check inventory levels and trigger automated supplier emails if needed
      await checkAndAlertSuppliers(selectedComponent);
      
      setOpen(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Log Usage
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Component Usage</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Component *</Label>
            <Select value={selectedComponent} onValueChange={setSelectedComponent} required>
              <SelectTrigger>
                <SelectValue placeholder="Select component" />
              </SelectTrigger>
              <SelectContent>
                {components.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} (Stock: {c.current_stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="units_used">Units Used *</Label>
            <Input id="units_used" name="units_used" type="number" min="1" required />
          </div>
          <div>
            <Label htmlFor="date">Date *</Label>
            <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !selectedComponent}>
            {loading ? 'Logging...' : 'Log Usage'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
