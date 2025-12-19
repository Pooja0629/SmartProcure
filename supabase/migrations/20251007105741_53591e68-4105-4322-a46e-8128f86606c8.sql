-- Create email tracking table
CREATE TABLE public.email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('critical', 'reorder', 'low_stock')),
  subject TEXT NOT NULL,
  email_body TEXT NOT NULL,
  sent_to TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'failed')),
  modified_by_manager BOOLEAN DEFAULT false,
  original_quantity INTEGER,
  final_quantity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view email history"
  ON public.email_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create email history"
  ON public.email_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_email_history_component ON email_history(component_id);
CREATE INDEX idx_email_history_sent_at ON email_history(sent_at DESC);

-- Create email settings table
CREATE TABLE public.email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL DEFAULT 'inventory@company.com',
  auto_send_enabled BOOLEAN DEFAULT false,
  critical_threshold_percent INTEGER DEFAULT 50,
  reorder_threshold_percent INTEGER DEFAULT 100,
  low_stock_threshold_percent INTEGER DEFAULT 150,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own email settings"
  ON public.email_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email settings"
  ON public.email_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email settings"
  ON public.email_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();