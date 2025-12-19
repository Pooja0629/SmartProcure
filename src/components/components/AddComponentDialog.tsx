import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddComponentDialogProps {
  onSuccess: () => void;
}

export function AddComponentDialog({ onSuccess }: AddComponentDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    current_stock: 0,
    min_stock: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: component, error } = await supabase
        .from('components')
        .insert([{
          name: formData.name,
          category: 'General', // Default category (required by database)
          current_stock: formData.current_stock,
          min_stock: formData.min_stock,
          // No lead_time_days or shelf_life_months - these come from suppliers
        }])
        .select()
        .single();

      if (error) throw error;

      toast({ 
        title: 'Success', 
        description: 'Component added successfully. Use "Manage Suppliers" to add suppliers and pricing.' 
      });
      
      setOpen(false);
      setFormData({
        name: '',
        current_stock: 0,
        min_stock: 0,
      });
      onSuccess();
      
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Component
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Component</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Component Name</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter component name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="current_stock">Current Stock</Label>
              <Input
                id="current_stock"
                type="number"
                required
                min="0"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="min_stock">Minimum Stock</Label>
              <Input
                id="min_stock"
                type="number"
                required
                min="0"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>💡 <strong>Note:</strong> After creating the component, use the "Manage Suppliers" button to add suppliers, pricing, lead times, and shelf life information.</p>
          </div>

          <Button type="submit" className="w-full">Add Component</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}