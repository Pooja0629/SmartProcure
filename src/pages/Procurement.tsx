import { useState, useEffect } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingDown, 
  Clock, 
  ShoppingCart,
  Search,
  Package,
  Star,
  Crown
} from 'lucide-react';
import { formatINR } from '@/lib/currency';

interface ProcurementItem {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  min_stock: number;
  recommendedQuantity: number;
  currentSupplierPrice: number;
  availableSuppliers: any[];
  bestSupplier: any;
  savings: number;
}

interface SupplierScore {
  supplier: any;
  totalScore: number;
  priceScore: number;
  leadTimeScore: number;
  ratingScore: number;
  isBest: boolean;
}

export default function Procurement() {
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const calculateReorderQuantity = (component: any): number => {
    const healthyLevel = Math.ceil(component.min_stock * 1.10);
    const recommendedQty = healthyLevel - component.current_stock;
    return Math.max(recommendedQty, 0);
  };

  // NEW: Calculate supplier score based on price, lead time, and rating
  const calculateSupplierScore = (supplier: any, currentSupplierPrice: number): SupplierScore => {
    const price = supplier.unit_price;
    const leadTime = supplier.lead_time_days || 7;
    const rating = supplier.suppliers.rating || 0;

    // Normalize scores (0-100 scale)
    const maxExpectedPrice = Math.max(price, currentSupplierPrice) * 1.5;
    const priceScore = Math.max(0, 100 - (price / maxExpectedPrice) * 100);
    
    const maxExpectedLeadTime = 60; // 60 days max lead time
    const leadTimeScore = Math.max(0, 100 - (leadTime / maxExpectedLeadTime) * 100);
    
    const ratingScore = (rating / 4) * 100; // Convert 0-4 to 0-100

    // Weighted scoring (40% price, 30% lead time, 30% rating)
    const totalScore = (priceScore * 0.4) + (leadTimeScore * 0.3) + (ratingScore * 0.3);

    return {
      supplier,
      totalScore,
      priceScore,
      leadTimeScore,
      ratingScore,
      isBest: false // Will be set later when comparing all suppliers
    };
  };

  const getComponentSuppliers = async (componentId: string) => {
    const { data: componentSuppliers } = await supabase
      .from('component_suppliers')
      .select(`
        unit_price,
        lead_time_days,
        suppliers (
          id,
          name,
          email,
          rating
        )
      `)
      .eq('component_id', componentId);

    return componentSuppliers || [];
  };

  const getCurrentSupplierPrice = async (componentId: string): Promise<number> => {
    const { data: componentSupplier } = await supabase
      .from('component_suppliers')
      .select('unit_price')
      .eq('component_id', componentId)
      .eq('is_primary', true)
      .single();

    return componentSupplier?.unit_price || 0;
  };

  useEffect(() => {
    fetchProcurementData();
  }, []);

  const fetchProcurementData = async () => {
    setLoading(true);
    try {
      const { data: components, error } = await supabase
        .from('components')
        .select('*');

      if (error) throw error;
      
      const lowStockComponents = (components || []).filter(
        comp => comp.current_stock <= comp.min_stock * 1.10
      );

      const procurementItems: ProcurementItem[] = await Promise.all(
        lowStockComponents.map(async (comp) => {
          const currentSupplierPrice = await getCurrentSupplierPrice(comp.id);
          const availableSuppliers = await getComponentSuppliers(comp.id);
          const recommendedQuantity = calculateReorderQuantity(comp);
          
          // NEW: Calculate scores for all suppliers and find the best one
          let supplierScores: SupplierScore[] = [];
          let bestSupplier = null;
          let maxScore = -1;

          if (availableSuppliers.length > 0) {
            supplierScores = availableSuppliers.map(supplier => 
              calculateSupplierScore(supplier, currentSupplierPrice)
            );

            // Find the supplier with the highest score
            supplierScores.forEach(score => {
              if (score.totalScore > maxScore) {
                maxScore = score.totalScore;
                bestSupplier = score.supplier;
              }
            });

            // Mark the best supplier
            supplierScores = supplierScores.map(score => ({
              ...score,
              isBest: score.supplier === bestSupplier
            }));
          }

          // Calculate savings based on best supplier vs current
          let savings = 0;
          if (bestSupplier && currentSupplierPrice > 0) {
            const bestSupplierPrice = bestSupplier.unit_price;
            if (bestSupplierPrice < currentSupplierPrice) {
              savings = (currentSupplierPrice - bestSupplierPrice) * recommendedQuantity;
              savings = Math.round(savings * 100) / 100;
            }
          }

          return {
            id: comp.id,
            name: comp.name,
            category: comp.category,
            current_stock: comp.current_stock,
            min_stock: comp.min_stock,
            recommendedQuantity,
            currentSupplierPrice,
            availableSuppliers: supplierScores, // Now includes scores
            bestSupplier,
            savings
          };
        })
      );

      setItems(procurementItems);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (item: ProcurementItem, selectedSupplier: any) => {
    try {
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('id')
        .eq('name', selectedSupplier.supplier.suppliers.name)
        .single();

      if (!supplierData) {
        toast({
          title: 'Error',
          description: 'Supplier not found',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase.from('orders').insert({
        component_id: item.id,
        supplier_id: supplierData.id,
        quantity: item.recommendedQuantity,
        unit_price: selectedSupplier.supplier.unit_price,
        order_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Order created for ${item.name} with ${selectedSupplier.supplier.suppliers.name}`
      });

      fetchProcurementData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalSavings = items.reduce((sum, item) => sum + item.savings, 0);
  const activeSuppliersCount = new Set(
    items.flatMap(item => item.availableSuppliers.map(s => s.supplier.suppliers.name))
  ).size;

  return (
    <div className="flex min-h-screen bg-background">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Smart Procurement
          </h1>
          <p className="text-muted-foreground">
            Intelligent supplier selection based on price, lead time, and ratings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Components to Reorder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-primary" />
                <span className="text-3xl font-bold">{items.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Potential Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-8 w-8 text-green-500" />
                <span className="text-3xl font-bold text-green-500">
                  {formatINR(totalSavings)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Suppliers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-yellow-500" />
                <span className="text-3xl font-bold">{activeSuppliersCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search components..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading procurement data...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {search ? 'No components found' : 'All components are adequately stocked'}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredItems.map(item => (
              <Card key={item.id} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-1">{item.name}</CardTitle>
                      <CardDescription>{item.category}</CardDescription>
                    </div>
                    <Badge variant="destructive">
                      Stock: {item.current_stock}/{item.min_stock}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 p-4 bg-accent/50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Recommended Quantity</p>
                        <p className="text-2xl font-bold text-primary">{item.recommendedQuantity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Current Supplier Price</p>
                        <p className="text-2xl font-bold">
                          {item.currentSupplierPrice ? formatINR(item.currentSupplierPrice) : 'Price not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Potential Savings</p>
                        <p className="text-2xl font-bold text-green-500 flex items-center gap-1">
                          <TrendingDown className="h-5 w-5" />
                          {formatINR(item.savings)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-lg mb-3">Available Suppliers</h4>
                    
                    {item.availableSuppliers.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No suppliers available for this component</p>
                      </div>
                    ) : (
                      item.availableSuppliers.map((supplierScore, idx) => (
                        <div
                          key={supplierScore.supplier.suppliers.name}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            supplierScore.isBest
                              ? 'border-yellow-500 bg-yellow-500/10'
                              : supplierScore.supplier.unit_price < item.currentSupplierPrice
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex justify-between items-center flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px]">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-semibold">{supplierScore.supplier.suppliers.name}</h5>
                                {supplierScore.isBest && (
                                  <Badge variant="default" className="bg-yellow-500">
                                    <Crown className="h-3 w-3 mr-1" />
                                    Best Supplier
                                  </Badge>
                                )}
                                {!supplierScore.isBest && supplierScore.supplier.unit_price < item.currentSupplierPrice && (
                                  <Badge variant="default" className="bg-green-500">
                                    Cheaper Alternative
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {supplierScore.supplier.lead_time_days || 7} days
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  {supplierScore.supplier.suppliers.rating || 0}/4
                                </span>
                                <span className="text-xs">{supplierScore.supplier.suppliers.email}</span>
                              </div>
                              {supplierScore.isBest && (
                                <div className="text-xs text-muted-foreground">
                                  Score: {Math.round(supplierScore.totalScore)}/100 
                                  (Price: {Math.round(supplierScore.priceScore)}, 
                                  Lead Time: {Math.round(supplierScore.leadTimeScore)}, 
                                  Rating: {Math.round(supplierScore.ratingScore)})
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Unit Price</p>
                                <p className="text-xl font-bold">{formatINR(supplierScore.supplier.unit_price)}</p>
                              </div>

                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Total Cost</p>
                                <p className="text-xl font-bold">
                                  {formatINR(supplierScore.supplier.unit_price * item.recommendedQuantity)}
                                </p>
                              </div>

                              <Button
                                onClick={() => handleCreateOrder(item, supplierScore)}
                                className="gap-2"
                                variant={supplierScore.isBest ? "default" : "outline"}
                              >
                                <ShoppingCart className="h-4 w-4" />
                                Order
                              </Button>
                            </div>
                          </div>

                          {supplierScore.supplier.unit_price < item.currentSupplierPrice && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-sm text-green-500 flex items-center gap-1">
                                <TrendingDown className="h-4 w-4" />
                                Save {formatINR((item.currentSupplierPrice - supplierScore.supplier.unit_price) * item.recommendedQuantity)} vs current supplier
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}