-- Create component_suppliers junction table for multi-supplier relationships
CREATE TABLE public.component_suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id uuid NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  unit_price numeric NOT NULL,
  lead_time_days integer NOT NULL DEFAULT 7,
  min_order_quantity integer NOT NULL DEFAULT 1,
  is_primary boolean NOT NULL DEFAULT false,
  reliability_score numeric DEFAULT 5.0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(component_id, supplier_id)
);

-- Create supplier_price_history table for price tracking
CREATE TABLE public.supplier_price_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_supplier_id uuid NOT NULL REFERENCES public.component_suppliers(id) ON DELETE CASCADE,
  unit_price numeric NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.component_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for component_suppliers
CREATE POLICY "Authenticated users can view component suppliers"
ON public.component_suppliers FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create component suppliers"
ON public.component_suppliers FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update component suppliers"
ON public.component_suppliers FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete component suppliers"
ON public.component_suppliers FOR DELETE
USING (true);

-- RLS Policies for supplier_price_history
CREATE POLICY "Authenticated users can view price history"
ON public.supplier_price_history FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create price history"
ON public.supplier_price_history FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at on component_suppliers
CREATE TRIGGER update_component_suppliers_updated_at
BEFORE UPDATE ON public.component_suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_component_suppliers_component ON public.component_suppliers(component_id);
CREATE INDEX idx_component_suppliers_supplier ON public.component_suppliers(supplier_id);
CREATE INDEX idx_price_history_component_supplier ON public.supplier_price_history(component_supplier_id);