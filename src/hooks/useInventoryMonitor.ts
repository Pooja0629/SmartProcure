import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to monitor inventory levels and trigger automated emails
 * Runs checks when usage is logged or component stock changes
 */
export function useInventoryMonitor() {
  const { toast } = useToast();

  const checkAndAlertSuppliers = async (componentId?: string) => {
    try {
      // Query for components that need alerts
      let query = supabase
        .from('components')
        .select('*, suppliers(*)');
      
      if (componentId) {
        query = query.eq('id', componentId);
      }

      const { data: components, error } = await query;

      if (error) throw error;

      for (const component of components || []) {
        if (!component.suppliers?.email) continue;

        const stockPercentage = (component.current_stock / component.min_stock) * 100;

        // Critical alert: stock below 50% of minimum
        if (component.current_stock < component.min_stock * 0.5) {
          console.log(`Sending critical alert for ${component.name}`);
          await sendAlert(component.id, 'critical');
          
          toast({
            title: 'Critical Alert Sent',
            description: `Automated email sent to ${component.suppliers.name} for ${component.name}`,
            variant: 'destructive',
          });
        }
        // Reorder alert: stock at or below minimum but above critical
        else if (component.current_stock <= component.min_stock) {
          console.log(`Sending reorder alert for ${component.name}`);
          await sendAlert(component.id, 'reorder');
          
          toast({
            title: 'Reorder Alert Sent',
            description: `Automated email sent to ${component.suppliers.name} for ${component.name}`,
          });
        }
      }
    } catch (error) {
      console.error('Error checking inventory:', error);
    }
  };

  const sendAlert = async (componentId: string, alertType: 'critical' | 'reorder') => {
    try {
      const { data, error } = await supabase.functions.invoke('send-supplier-alert', {
        body: { componentId, alertType }
      });

      if (error) {
        console.error('Failed to send alert:', error);
        throw error;
      }

      console.log('Alert sent successfully:', data);
    } catch (error) {
      console.error('Error invoking send-supplier-alert:', error);
    }
  };

  return { checkAndAlertSuppliers };
}
