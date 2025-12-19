export interface Component {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  min_stock: number;
  lead_time_days: number;
  shelf_life_months?: number | null;
  created_at: string;
  updated_at: string;
  safety_stock?: number | null;
  optimal_inventory_level?: number | null;
  reorder_quantity?: number | null;
  criticality_score?: number | null;
  description?: string;
}

export interface SupplierPricing {
  id: string;
  component_id: string;
  supplier_id: string;
  price: number;
  lead_time_days: number;
  quality_rating: number;
  reliability_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  supplied_components?: string[];
}

export interface UsageHistory {
  id: string;
  component_id: string;
  date: string;
  units_used: number;
  created_at: string;
}

export interface Order {
  id: string;
  component_id: string;
  supplier_id: string;
  quantity: number;
  order_date: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  unit_price: number;
  total_amount: number;
}

export interface DashboardMetrics {
  total_components: number;
  low_stock_alerts: number;
  critical_components: number;
  pending_orders: number;
  total_inventory_value: number;
  avg_lead_time: number;
}

export type OrderStatus = Order['status'];

export interface SupplierOption {
  supplier_id: string;
  supplier_name: string;
  price: number;
  lead_time_days: number;
  quality_rating: number;
  reliability_score: number;
  total_score: number;
}

export interface ComponentWithPricing extends Component {
  supplier_options: SupplierOption[];
  min_price: number;
  max_price: number;
  recommended_supplier?: SupplierOption;
}