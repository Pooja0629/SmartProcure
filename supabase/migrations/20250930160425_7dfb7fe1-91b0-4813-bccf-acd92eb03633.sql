-- Create suppliers table first (no dependencies)
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create components table
CREATE TABLE public.components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  lead_time_days INTEGER NOT NULL DEFAULT 7 CHECK (lead_time_days > 0),
  safety_stock INTEGER,
  optimal_inventory_level INTEGER,
  reorder_quantity INTEGER,
  criticality_score DECIMAL(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create usage_history table
CREATE TABLE public.usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  units_used INTEGER NOT NULL CHECK (units_used >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users full access (internal business system)
CREATE POLICY "Authenticated users can view suppliers"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create suppliers"
  ON public.suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers"
  ON public.suppliers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete suppliers"
  ON public.suppliers FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view components"
  ON public.components FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create components"
  ON public.components FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update components"
  ON public.components FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete components"
  ON public.components FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view usage history"
  ON public.usage_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create usage history"
  ON public.usage_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update usage history"
  ON public.usage_history FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete usage history"
  ON public.usage_history FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for components table
CREATE TRIGGER update_components_updated_at
  BEFORE UPDATE ON public.components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample suppliers
INSERT INTO public.suppliers (name, email, phone, address, rating) VALUES
  ('TechElec Components', 'sales@techelec.com', '+1-555-0123', '123 Industrial Blvd, Tech City, TC 12345', 4.8),
  ('Components Plus', 'orders@componentsplus.com', '+1-555-0456', '456 Electronics Way, Component Valley, CV 67890', 4.6),
  ('MicroChip Supply Co.', 'info@microchipsupply.com', '+1-555-0789', '789 Semiconductor St, Silicon Hills, SH 13579', 4.9),
  ('Safety Components Inc.', 'orders@safetycomponents.com', '+1-555-0234', '234 Protection Ave, Safety Town, ST 24680', 4.7),
  ('Power Electronics Ltd.', 'info@powerelectronics.com', '+1-555-0567', '567 Voltage Dr, Power City, PC 97531', 4.5);

-- Insert sample components (using supplier IDs)
INSERT INTO public.components (name, category, current_stock, min_stock, unit_cost, supplier_id, lead_time_days)
SELECT 
  '10kΩ Resistor', 
  'Passive Components', 
  450, 
  100, 
  0.05, 
  id, 
  7
FROM public.suppliers WHERE email = 'sales@techelec.com';

INSERT INTO public.components (name, category, current_stock, min_stock, unit_cost, supplier_id, lead_time_days)
SELECT 
  '100nF Ceramic Capacitor', 
  'Passive Components', 
  320, 
  150, 
  0.08, 
  id, 
  5
FROM public.suppliers WHERE email = 'orders@componentsplus.com';

INSERT INTO public.components (name, category, current_stock, min_stock, unit_cost, supplier_id, lead_time_days)
SELECT 
  '555 Timer IC', 
  'Integrated Circuits', 
  85, 
  50, 
  1.25, 
  id, 
  14
FROM public.suppliers WHERE email = 'sales@techelec.com';

INSERT INTO public.components (name, category, current_stock, min_stock, unit_cost, supplier_id, lead_time_days)
SELECT 
  'ATMega328P Microcontroller', 
  'Integrated Circuits', 
  25, 
  30, 
  3.50, 
  id, 
  21
FROM public.suppliers WHERE email = 'info@microchipsupply.com';

INSERT INTO public.components (name, category, current_stock, min_stock, unit_cost, supplier_id, lead_time_days)
SELECT 
  'USB Type-C Connector', 
  'Connectors', 
  120, 
  50, 
  0.85, 
  id, 
  10
FROM public.suppliers WHERE email = 'orders@componentsplus.com';

INSERT INTO public.components (name, category, current_stock, min_stock, unit_cost, supplier_id, lead_time_days)
SELECT 
  'Red LED 5mm', 
  'Optoelectronics', 
  8, 
  25, 
  0.15, 
  id, 
  7
FROM public.suppliers WHERE email = 'sales@techelec.com';

INSERT INTO public.components (name, category, current_stock, min_stock, unit_cost, supplier_id, lead_time_days)
SELECT 
  '5A Fuse', 
  'Protection Components', 
  200, 
  75, 
  0.35, 
  id, 
  5
FROM public.suppliers WHERE email = 'orders@safetycomponents.com';

INSERT INTO public.components (name, category, current_stock, min_stock, unit_cost, supplier_id, lead_time_days)
SELECT 
  'LM7805 Voltage Regulator', 
  'Power Management', 
  60, 
  40, 
  0.75, 
  id, 
  12
FROM public.suppliers WHERE email = 'info@powerelectronics.com';