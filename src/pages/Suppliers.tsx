import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AddSupplierDialog } from '@/components/suppliers/AddSupplierDialog';
import { EditSupplierDialog } from '@/components/suppliers/EditSupplierDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Star, Mail, Phone, MapPin, Calendar, Trash2, Package } from 'lucide-react';
import { Navigation } from '@/components/layout/Navigation';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select(`
        *,
        component_suppliers(
          components(name)
        )
      `)
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load suppliers',
        variant: 'destructive',
      });
    } else {
      setSuppliers(data || []);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete supplier "${name}"?`)) return;

    const { error } = await supabase.from('suppliers').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Deleted', description: 'Supplier removed successfully' });
      fetchSuppliers();
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen">
      <Navigation />

      {/* GAP FIXED HERE: removed ml-64 */}
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Supplier Management</h1>
            <p className="text-muted-foreground">
              Manage your supplier network and relationships
            </p>
          </div>
          <AddSupplierDialog onSuccess={fetchSuppliers} />
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Badge variant="secondary">
            {filteredSuppliers.length} suppliers
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex justify-between">
                  <div>
                    <CardTitle>{supplier.name}</CardTitle>
                    <div className="flex items-center gap-1 mt-1">
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
                      <span className="text-xs text-muted-foreground ml-1">
                        ({supplier.rating || 0}/4)
                      </span>
                    </div>
                  </div>

                  <EditSupplierDialog
                    supplier={supplier}
                    onSuccess={fetchSuppliers}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{supplier.email}</span>
                </div>

                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" />
                    <span>{supplier.phone}</span>
                  </div>
                )}

                {supplier.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>{supplier.address}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Member since {new Date(supplier.created_at).getFullYear()}
                  </span>
                </div>

                <div className="border-t pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() =>
                      setExpandedSupplier(
                        expandedSupplier === supplier.id ? null : supplier.id
                      )
                    }
                  >
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Components Supplied ({supplier.component_suppliers?.length || 0})
                    </span>
                  </Button>

                  {expandedSupplier === supplier.id && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {supplier.component_suppliers?.map((cs: any) => (
                        <Badge key={cs.id} variant="outline" className="text-xs">
                          {cs.components.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive mt-2"
                  onClick={() => handleDelete(supplier.id, supplier.name)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Supplier
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No suppliers found
          </div>
        )}
      </div>
    </div>
  );
}
