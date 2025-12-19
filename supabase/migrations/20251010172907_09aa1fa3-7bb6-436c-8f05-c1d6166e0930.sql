-- Add shelf life tracking to components
ALTER TABLE public.components 
ADD COLUMN IF NOT EXISTS shelf_life_months integer;

-- Clear existing sample data
TRUNCATE TABLE public.usage_history CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.component_suppliers CASCADE;
TRUNCATE TABLE public.supplier_price_history CASCADE;
TRUNCATE TABLE public.components CASCADE;
TRUNCATE TABLE public.suppliers CASCADE;

-- Insert real electronic component suppliers with complete details
INSERT INTO public.suppliers (name, email, phone, address, rating) VALUES
('TechSource Electronics', 'sales@techsource.in', '+91-22-2765-4321', 'Shop 45, Lamington Road, Mumbai, Maharashtra 400008', 4.5),
('Reliable Components Ltd', 'orders@reliablecomp.in', '+91-80-4123-5678', '12th Cross, Jayanagar 4th Block, Bangalore, Karnataka 560011', 4.8),
('MaxChip Distributors', 'info@maxchip.in', '+91-11-2634-9087', 'B-24, Nehru Place, New Delhi, Delhi 110019', 4.2),
('ElectroBazaar India', 'support@electrobazaar.in', '+91-44-2815-6789', '156 NSC Bose Road, Chennai, Tamil Nadu 600001', 4.6),
('Prime Electronics Supply', 'sales@primeelec.in', '+91-20-2567-8901', 'FC Road, Shivaji Nagar, Pune, Maharashtra 411005', 4.4),
('Circuit Masters', 'orders@circuitmasters.in', '+91-79-2658-3456', 'CG Road, Navrangpura, Ahmedabad, Gujarat 380009', 4.7);

-- Insert real electronic components with proper categorization and shelf life
INSERT INTO public.components (name, category, current_stock, min_stock, unit_cost, lead_time_days, shelf_life_months, safety_stock, optimal_inventory_level, reorder_quantity, criticality_score) VALUES
-- Passive Components
('1K Ohm Resistor (1/4W)', 'Passive Components', 15000, 5000, 0.15, 3, 120, 7500, 20000, 10000, 8),
('10K Ohm Resistor (1/4W)', 'Passive Components', 12000, 4000, 0.15, 3, 120, 6000, 18000, 8000, 8),
('100uF Electrolytic Capacitor (25V)', 'Passive Components', 3500, 1000, 4.50, 5, 24, 1500, 5000, 2000, 9),
('10uF Ceramic Capacitor (50V)', 'Passive Components', 8000, 2500, 2.80, 4, 60, 3500, 10000, 4000, 7),
('100nF Ceramic Capacitor', 'Passive Components', 10000, 3000, 1.50, 3, 60, 4500, 12000, 5000, 7),

-- Integrated Circuits
('ATmega328P Microcontroller', 'Integrated Circuits', 450, 200, 125.00, 7, 36, 300, 800, 400, 9),
('LM358 Dual Op-Amp', 'Integrated Circuits', 800, 300, 18.50, 5, 48, 400, 1200, 500, 8),
('7805 Voltage Regulator', 'Integrated Circuits', 600, 250, 12.00, 4, 48, 350, 1000, 400, 8),
('555 Timer IC', 'Integrated Circuits', 1200, 400, 8.50, 4, 48, 600, 1800, 700, 7),
('74HC595 Shift Register', 'Integrated Circuits', 350, 150, 15.50, 6, 36, 200, 600, 300, 7),

-- Connectors
('2.54mm Pin Headers (40 pin)', 'Connectors', 2000, 600, 8.00, 3, 96, 900, 2800, 1200, 6),
('JST XH 2.54mm Connector (2 pin)', 'Connectors', 1500, 500, 3.50, 4, 96, 750, 2200, 800, 6),
('USB Type-C Female Port', 'Connectors', 300, 100, 22.00, 7, 60, 150, 500, 250, 8),
('DC Power Jack (5.5x2.1mm)', 'Connectors', 800, 250, 6.50, 4, 96, 400, 1200, 500, 7),

-- Optoelectronics  
('5mm Red LED', 'Optoelectronics', 5000, 2000, 0.80, 3, 60, 2500, 7000, 3000, 5),
('5mm White LED (High Brightness)', 'Optoelectronics', 3000, 1000, 2.50, 4, 60, 1500, 4500, 2000, 6),
('0.96" OLED Display (I2C)', 'Optoelectronics', 180, 50, 280.00, 10, 24, 80, 300, 150, 8),

-- Protection Components
('1N4007 Diode', 'Protection Components', 4000, 1500, 0.60, 3, 120, 2000, 6000, 2500, 7),
('Zener Diode 5.1V (1/2W)', 'Protection Components', 2500, 800, 1.20, 4, 120, 1200, 3500, 1500, 7),
('Resettable Fuse 1A', 'Protection Components', 1200, 400, 5.50, 5, 84, 600, 1800, 800, 8),

-- Power Management
('AMS1117-3.3V LDO Regulator', 'Power Management', 600, 200, 8.50, 6, 48, 300, 900, 400, 8),
('MP2307 Buck Converter IC', 'Power Management', 250, 100, 18.00, 7, 36, 150, 450, 200, 9);

-- Create component-supplier relationships with realistic pricing variations
DO $$
DECLARE
  comp_record RECORD;
  sup_ids uuid[];
  primary_supplier uuid;
  other_supplier uuid;
  supplier_count int;
  used_suppliers uuid[];
BEGIN
  -- Get all supplier IDs
  SELECT ARRAY_AGG(id) INTO sup_ids FROM public.suppliers;
  
  -- For each component, assign 2-3 suppliers with varying prices
  FOR comp_record IN SELECT id, unit_cost, lead_time_days FROM public.components LOOP
    used_suppliers := ARRAY[]::uuid[];
    
    -- Assign primary supplier (best price)
    primary_supplier := sup_ids[1 + floor(random() * array_length(sup_ids, 1))::int];
    used_suppliers := array_append(used_suppliers, primary_supplier);
    
    INSERT INTO public.component_suppliers (component_id, supplier_id, unit_price, lead_time_days, min_order_quantity, is_primary, reliability_score)
    VALUES (
      comp_record.id,
      primary_supplier,
      comp_record.unit_cost,
      comp_record.lead_time_days,
      CASE 
        WHEN comp_record.unit_cost < 5 THEN 100
        WHEN comp_record.unit_cost < 50 THEN 50
        ELSE 10
      END,
      true,
      4.5 + (random() * 0.5)
    );
    
    -- Add 1-2 alternative suppliers with higher prices
    supplier_count := 1 + floor(random() * 2)::int;
    FOR i IN 1..supplier_count LOOP
      -- Find a supplier that hasn't been used yet
      LOOP
        other_supplier := sup_ids[1 + floor(random() * array_length(sup_ids, 1))::int];
        EXIT WHEN NOT (other_supplier = ANY(used_suppliers));
      END LOOP;
      
      used_suppliers := array_append(used_suppliers, other_supplier);
      
      INSERT INTO public.component_suppliers (component_id, supplier_id, unit_price, lead_time_days, min_order_quantity, is_primary, reliability_score)
      VALUES (
        comp_record.id,
        other_supplier,
        comp_record.unit_cost * (1.15 + random() * 0.35), -- 15-50% higher price
        comp_record.lead_time_days + floor(random() * 3)::int, -- 0-2 days more lead time
        CASE 
          WHEN comp_record.unit_cost < 5 THEN 100
          WHEN comp_record.unit_cost < 50 THEN 50
          ELSE 10
        END,
        false,
        4.0 + (random() * 0.8)
      );
    END LOOP;
  END LOOP;
END $$;