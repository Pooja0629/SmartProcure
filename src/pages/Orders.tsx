import { useState, useEffect } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, Calendar, Building2, Upload, CheckCircle, Truck } from 'lucide-react';
import { CreateOrderDialog } from '@/components/orders/CreateOrderDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatINR } from '@/lib/currency';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'pending': return 'secondary' as const;
    case 'ordered': return 'default' as const;
    case 'received': return 'default' as const;
    case 'cancelled': return 'destructive' as const;
    default: return 'secondary' as const;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'text-yellow-600 bg-yellow-100';
    case 'ordered': return 'text-blue-600 bg-blue-100';
    case 'received': return 'text-green-600 bg-green-100';
    case 'cancelled': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, components(*), suppliers(*)')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setOrders(data || []);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this order?')) return;

    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Order cancelled' });
      fetchOrders();
    }
  };

  const handleOrderPlaced = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'ordered',
        ordered_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Order marked as placed' });
      fetchOrders();
    }
  };

  const handleSuppliesReceived = async (orderId: string) => {
    // First get the order details to update stock
    const { data: order } = await supabase
      .from('orders')
      .select('*, components(*)')
      .eq('id', orderId)
      .single();

    if (order) {
      // Update stock level
      const { error: stockError } = await supabase
        .from('components')
        .update({ 
          current_stock: order.components.current_stock + order.quantity 
        })
        .eq('id', order.component_id);

      if (stockError) {
        toast({ title: 'Error', description: 'Failed to update stock', variant: 'destructive' });
        return;
      }

      // Update order status
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'received',
          received_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ 
          title: 'Success', 
          description: `Supplies received and stock updated by ${order.quantity} units` 
        });
        fetchOrders();
      }
    }
  };

  const handleInvoiceUpload = async (orderId: string, file: File) => {
    setUploading(orderId);
    
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}-invoice-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      // Update order with invoice URL
      const { error: updateError } = await supabase
        .from('orders')
        .update({ tax_invoice_url: publicUrl })
        .eq('id', orderId);

      if (updateError) throw updateError;

      toast({ title: 'Success', description: 'Invoice uploaded successfully' });
      fetchOrders();
      
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.components?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.suppliers?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.order_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Navigation />
      
      <main className="flex-1 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Order Management
              </h1>
              <p className="text-muted-foreground">
                Track and manage your component orders
              </p>
            </div>
            <CreateOrderDialog onSuccess={fetchOrders} />
          </div>
          
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search orders by component, supplier, or order number..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="shadow-card hover:shadow-elevated transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {order.order_number ? `Order ${order.order_number}` : `Order #${order.id.slice(0, 8)}`}
                      </h3>
                      <p className="text-muted-foreground">{order.components?.name}</p>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(order.status)} className={`capitalize ${getStatusColor(order.status)}`}>
                    {order.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Component</p>
                    <p className="font-medium">{order.components?.name}</p>
                    <p className="text-sm text-muted-foreground">{order.components?.category}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Supplier</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{order.suppliers?.name}</p>
                        <p className="text-sm text-muted-foreground">{order.suppliers?.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Quantity & Value</p>
                    <p className="font-medium">{order.quantity} units</p>
                    <p className="text-sm text-muted-foreground">
                      {order.unit_price 
                        ? `${formatINR(order.unit_price)} each • ${formatINR(order.unit_price * order.quantity)} total`
                        : 'Price not set'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Order Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">
                        {new Date(order.order_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Invoice Section */}
                {order.tax_invoice_url && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Tax Invoice Uploaded
                    </p>
                    <a 
                      href={order.tax_invoice_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:text-green-800 underline"
                    >
                      View Invoice
                    </a>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-6 pt-4 border-t border-border flex-wrap">
                  {/* Order Placed Button - Only show for pending orders */}
                  {order.status === 'pending' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleOrderPlaced(order.id)}
                      className="gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Order Placed
                    </Button>
                  )}

                  {/* Supplies Received Button - Only show for ordered orders */}
                  {order.status === 'ordered' && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleSuppliesReceived(order.id)}
                      className="gap-2"
                    >
                      <Truck className="h-4 w-4" />
                      Supplies Received
                    </Button>
                  )}

                  {/* Invoice Upload - Show for all active orders */}
                  {(order.status === 'ordered' || order.status === 'received') && (
                    <div className="relative">
                      <input
                        type="file"
                        id={`invoice-${order.id}`}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleInvoiceUpload(order.id, file);
                        }}
                        disabled={uploading === order.id}
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        asChild
                        disabled={uploading === order.id}
                        className="gap-2"
                      >
                        <label htmlFor={`invoice-${order.id}`}>
                          <Upload className="h-4 w-4" />
                          {uploading === order.id ? 'Uploading...' : 'Upload Invoice'}
                        </label>
                      </Button>
                    </div>
                  )}

                  {/* Cancel Button - Only show for pending orders */}
                  {order.status === 'pending' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive" 
                      onClick={() => handleCancel(order.id)}
                    >
                      Cancel Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No orders found</p>
          </div>
        )}
      </main>
    </div>
  );
}