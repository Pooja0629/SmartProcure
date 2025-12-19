import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Mail, AlertTriangle, Package, CheckCircle, Clock, Send, CheckCheck, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Component {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  min_stock: number;
  supplier_name: string;
  supplier_email: string;
}

interface EmailStatus {
  [componentId: string]: {
    sent: boolean;
    sentAt?: string;
    quantity?: number;
  };
}

export function EmailAlertsFixed() {
  const [criticalComponents, setCriticalComponents] = useState<Component[]>([]);
  const [reorderComponents, setReorderComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeQuantity, setComposeQuantity] = useState<number>(0);
  const [composeHtml, setComposeHtml] = useState('');
  const [composeType, setComposeType] = useState<null | 'critical' | 'reorder'>(null);
  const [composeComponent, setComposeComponent] = useState<Component | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>({});
  const { toast } = useToast();

  useEffect(() => {
    loadComponents();
    loadEmailStatus();
  }, []);

  const loadComponents = async () => {
    try {
      console.log('🔄 Loading components for alerts...');

      const { data: components, error: componentsError } = await supabase
        .from('components')
        .select('*')
        .order('current_stock', { ascending: true });

      if (componentsError) {
        console.error('Components error:', componentsError);
        throw componentsError;
      }

      const { data: supplierData, error: supplierError } = await supabase
        .from('component_suppliers')
        .select(`
          component_id,
          suppliers (
            name,
            email
          )
        `)
        .eq('is_primary', true);

      if (supplierError) {
        console.warn('Supplier error:', supplierError);
      }

      const critical: Component[] = [];
      const reorder: Component[] = [];

      components?.forEach((component) => {
        const supplierInfo = supplierData?.find(
          (item: any) => item.component_id === component.id
        );

        const componentWithSupplier: Component = {
          ...component,
          supplier_name: supplierInfo?.suppliers?.name || 'No Supplier',
          supplier_email: supplierInfo?.suppliers?.email || 'no-email@example.com'
        };

        if (component.current_stock < component.min_stock) {
          critical.push(componentWithSupplier);
        } else if (component.current_stock <= component.min_stock * 1.10) {
          reorder.push(componentWithSupplier);
        }
      });

      setCriticalComponents(critical);
      setReorderComponents(reorder);

    } catch (error: any) {
      console.error('💥 Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load component data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmailStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('email_history')
        .select('component_id, sent_at, final_quantity')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      console.log('📧 Email status loaded - Found emails:', data?.length || 0);
      console.log('📧 Raw email data:', data);

      const status: EmailStatus = {};
      data?.forEach(email => {
        if (email.component_id) {
          status[email.component_id] = {
            sent: true,
            sentAt: email.sent_at,
            quantity: email.final_quantity
          };
        }
      });

      console.log('📧 Processed email status:', status);
      setEmailStatus(status);
    } catch (error) {
      console.error('Error loading email status:', error);
    }
  };

  const refreshComponentData = async () => {
    console.log('🔄 Refreshing component data and email status...');
    await loadEmailStatus();
    await loadComponents();
  };

  const calculateRecommendedQuantity = (currentStock: number, minStock: number): number => {
    const healthyLevel = Math.ceil(minStock * 1.10);
    const recommendedQty = healthyLevel - currentStock;
    return Math.max(recommendedQty, 0);
  };

  const handleSendAllAlerts = async () => {
    setSending(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const component of criticalComponents) {
        const success = await sendAlert(component.id, 'critical');
        if (success) successCount++;
        else failCount++;
      }

      for (const component of reorderComponents) {
        const success = await sendAlert(component.id, 'reorder');
        if (success) successCount++;
        else failCount++;
      }

      if (successCount > 0) {
        toast({
          title: 'Alerts Sent Successfully',
          description: `${successCount} email alert(s) sent to suppliers`,
        });
      }

      if (failCount > 0) {
        toast({
          title: 'Some Alerts Failed',
          description: `${failCount} alert(s) failed to send`,
          variant: 'destructive',
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await refreshComponentData();
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send alerts',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const sendAlert = async (componentId: string, alertType: 'critical' | 'reorder') => {
    try {
      console.log(`📤 Sending alert for component: ${componentId}`);
      
      const { data, error } = await supabase.functions.invoke('send-supplier-alert', {
        body: { componentId, alertType }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }
      
      console.log('✅ Alert sent successfully:', data);
      
      // ✅ Wait longer for database to update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // ✅ Force refresh email status
      await loadEmailStatus();
      
      return true;
    } catch (error) {
      console.error('Failed to send alert:', error);
      return false;
    }
  };

  const openCompose = async (component: Component, type: 'critical' | 'reorder') => {
    try {
      setComposeLoading(true);
      setComposeComponent(component);
      setComposeType(type);
      setComposeOpen(true);

      const initialQuantity = calculateRecommendedQuantity(component.current_stock, component.min_stock);
      setComposeQuantity(initialQuantity);

      console.log('📧 Loading email preview for:', component.name, 'type:', type);

      const { data, error } = await supabase.functions.invoke('send-supplier-alert', {
        body: { 
          componentId: component.id, 
          alertType: type, 
          previewOnly: true,
          customQuantity: initialQuantity
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }

      console.log('✅ Preview data received:', data);

      const subject = data?.subject || data?.emailContent?.subject || `Purchase Order - ${component.name}`;
      const html = data?.html || data?.emailContent?.html || `<p>Purchase order for ${component.name}</p>`;

      setComposeSubject(subject);
      setComposeHtml(html);
      setComposeMessage('');

    } catch (err: any) {
      console.error('💥 Failed to load template preview', err);
      
      const fallbackSubject = `Purchase Order - ${component.name} - ${type === 'critical' ? 'URGENT' : 'Reorder'}`;
      const fallbackHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Purchase Order</h2>
          <p><strong>Component:</strong> ${component.name}</p>
          <p><strong>Quantity:</strong> ${calculateRecommendedQuantity(component.current_stock, component.min_stock)} units</p>
          <p><strong>Category:</strong> ${component.category}</p>
          <p><strong>Current Stock:</strong> ${component.current_stock}</p>
          <p><strong>Minimum Stock:</strong> ${component.min_stock}</p>
          <p><strong>Priority:</strong> ${type === 'critical' ? 'URGENT - Below Minimum Stock' : 'Reorder Recommended'}</p>
          <hr>
          <p>Please process this order at your earliest convenience.</p>
        </div>
      `;

      setComposeSubject(fallbackSubject);
      setComposeHtml(fallbackHtml);
      setComposeMessage('');

      toast({ 
        title: 'Using fallback template', 
        description: 'Could not load custom template, using default format',
        variant: 'default',
      });
    } finally {
      setComposeLoading(false);
    }
  };

  const updateEmailPreview = async () => {
    if (!composeComponent || !composeType) return;
    
    try {
      setComposeLoading(true);
      console.log('🔄 Updating preview with custom values...');

      const { data, error } = await supabase.functions.invoke('send-supplier-alert', {
        body: { 
          componentId: composeComponent.id, 
          alertType: composeType, 
          previewOnly: true,
          customSubject: composeSubject,
          customMessage: composeMessage,
          customQuantity: composeQuantity
        }
      });

      if (error) {
        console.error('❌ Update preview error:', error);
        throw error;
      }

      const html = data?.html || data?.emailContent?.html || composeHtml;
      setComposeHtml(html);

      console.log('✅ Preview updated successfully');

    } catch (err) {
      console.error('💥 Failed to update preview', err);
      
      const fallbackHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>${composeSubject}</h2>
          <p><strong>Component:</strong> ${composeComponent.name}</p>
          <p><strong>Quantity:</strong> ${composeQuantity} units</p>
          <p><strong>Category:</strong> ${composeComponent.category}</p>
          <p><strong>Current Stock:</strong> ${composeComponent.current_stock}</p>
          <p><strong>Minimum Stock:</strong> ${composeComponent.min_stock}</p>
          <p><strong>Priority:</strong> ${composeType === 'critical' ? 'URGENT - Below Minimum Stock' : 'Reorder Recommended'}</p>
          ${composeMessage ? `<p><strong>Additional Instructions:</strong> ${composeMessage}</p>` : ''}
          <hr>
          <p>Please process this order at your earliest convenience.</p>
        </div>
      `;
      
      setComposeHtml(fallbackHtml);
      
      toast({ 
        title: 'Using fallback preview', 
        description: 'Preview updated with fallback template',
        variant: 'default',
      });
    } finally {
      setComposeLoading(false);
    }
  };

  const sendComposedEmail = async () => {
    if (!composeComponent || !composeType) return;
    
    try {
      setComposeLoading(true);
      console.log('📤 Sending composed email for:', composeComponent.name);

      const { data, error } = await supabase.functions.invoke('send-supplier-alert', {
        body: {
          componentId: composeComponent.id,
          alertType: composeType,
          customSubject: composeSubject,
          customMessage: composeMessage,
          customQuantity: composeQuantity
        }
      });

      if (error) {
        console.error('❌ Send email error:', error);
        throw error;
      }

      console.log('✅ Email sent successfully:', data);
      
      toast({ 
        title: 'Email sent successfully', 
        description: `Order for ${composeQuantity} units sent to ${composeComponent.supplier_email}`,
      });
      
      setComposeOpen(false);
      
      // ✅ Wait longer and refresh properly
      await new Promise(resolve => setTimeout(resolve, 3000));
      await refreshComponentData();
      
      setComposeSubject('');
      setComposeMessage('');
      setComposeQuantity(0);
      
    } catch (err: any) {
      console.error('💥 Send failed', err);
      toast({ 
        title: 'Send failed', 
        description: err.message || 'Could not send email', 
        variant: 'destructive' 
      });
    } finally {
      setComposeLoading(false);
    }
  };

  const hasEmailSent = (componentId: string) => {
    const status = emailStatus[componentId];
    console.log(`🔍 Checking email status for ${componentId}:`, status);
    return status?.sent === true;
  };

  const getStockPercentage = (current: number, min: number) => {
    return ((current / min) * 100).toFixed(1);
  };

  const formatSentTime = (sentAt: string) => {
    return new Date(sentAt).toLocaleDateString() + ' ' + new Date(sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const handleManualRefresh = async () => {
    await refreshComponentData();
    toast({
      title: 'Refreshed',
      description: 'Component and email status updated',
    });
  };

  // TEMPORARY DEBUG FUNCTIONS - REMOVE AFTER TESTING
  const clearEmailHistory = async () => {
    try {
      const { error } = await supabase
        .from('email_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) throw error;
      
      toast({
        title: 'Email history cleared',
        description: 'All email records have been cleared. Please test again.',
      });
      
      await refreshComponentData();
    } catch (error) {
      console.error('Error clearing history:', error);
      toast({
        title: 'Error clearing history',
        variant: 'destructive',
      });
    }
  };

  const debugDatabaseState = async () => {
    try {
      const { data: allEmails, error: emailError } = await supabase
        .from('email_history')
        .select('*')
        .order('sent_at', { ascending: false });

      if (emailError) throw emailError;

      console.log('🔍 ALL Email History:', allEmails);
      
      toast({
        title: 'Database State',
        description: `Found ${allEmails?.length || 0} total emails`,
      });

    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Status
          </Button>
          
          {/* ADD THESE TEMPORARY BUTTONS */}
          <Button
            onClick={clearEmailHistory}
            variant="outline"
            size="sm"
            className="gap-2 bg-red-100 text-red-700 hover:bg-red-200"
          >
            Clear Email History
          </Button>
          
          <Button
            onClick={debugDatabaseState}
            variant="outline"
            size="sm"
            className="gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            Debug Database
          </Button>
        </div>
        
        {(criticalComponents.length > 0 || reorderComponents.length > 0) && (
          <Button
            onClick={handleSendAllAlerts}
            disabled={sending}
            className="gap-2 ml-auto"
            size="lg"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : 'Send All Alerts Now'}
          </Button>
        )}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <strong>Debug Info:</strong> 
              {Object.keys(emailStatus).length} emails in status | 
              Critical: {criticalComponents.length} | 
              Reorder: {reorderComponents.length}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 shadow-glow">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Automation Status</CardTitle>
          </div>
          <CardDescription>
            Emails are sent automatically when components reach critical or reorder levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg">
              <CheckCircle className="h-8 w-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">System Status</p>
                <p className="text-lg font-bold text-success">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Critical Alerts</p>
                <p className="text-lg font-bold text-destructive">{criticalComponents.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-warning/10 rounded-lg">
              <Clock className="h-8 w-8 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Reorder Alerts</p>
                <p className="text-lg font-bold text-warning">{reorderComponents.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg">
              <CheckCheck className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-lg font-bold text-blue-500">{Object.keys(emailStatus).length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {criticalComponents.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Critical Stock Alerts</CardTitle>
            </div>
            <CardDescription>
              These components are below minimum stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criticalComponents.map((component) => {
                const emailSent = hasEmailSent(component.id);
                const statusInfo = emailStatus[component.id];
                
                return (
                  <div
                    key={component.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      emailSent 
                        ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                        : 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Package className={`h-8 w-8 ${emailSent ? 'text-green-600' : 'text-destructive'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{component.name}</p>
                          {emailSent && (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              <CheckCheck className="h-3 w-3 mr-1" />
                              Email Sent
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Category: {component.category}</p>
                        <p className="text-sm text-muted-foreground">
                          Supplier: {component.supplier_name} ({component.supplier_email})
                        </p>
                        {emailSent && statusInfo?.sentAt && (
                          <p className="text-xs text-green-600 mt-1">
                            Ordered {statusInfo.quantity || 'some'} units on {formatSentTime(statusInfo.sentAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant={emailSent ? "outline" : "destructive"} className={`font-bold ${
                        emailSent ? 'border-green-300 text-green-700' : ''
                      }`}>
                        {emailSent ? 'ORDERED' : 'CRITICAL'}
                      </Badge>
                      <p className="text-sm font-mono">
                        <span className={emailSent ? "text-green-600 font-bold" : "text-destructive font-bold"}>
                          {component.current_stock}
                        </span> / {component.min_stock} units
                      </p>
                      <p className={`text-xs font-semibold ${
                        emailSent ? "text-green-600" : "text-destructive"
                      }`}>
                        {getStockPercentage(component.current_stock, component.min_stock)}% of minimum
                      </p>
                      <Button 
                        size="sm" 
                        variant={emailSent ? "outline" : "destructive"}
                        onClick={() => openCompose(component, 'critical')}
                        disabled={composeLoading}
                      >
                        {emailSent ? 'Resend Order' : 'Preview & Send'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {reorderComponents.length > 0 && (
        <Card className="border-warning/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <CardTitle className="text-warning">Reorder Recommendations</CardTitle>
            </div>
            <CardDescription>
              These components are near minimum stock (within 10% buffer)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reorderComponents.map((component) => {
                const emailSent = hasEmailSent(component.id);
                const statusInfo = emailStatus[component.id];
                
                return (
                  <div
                    key={component.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      emailSent 
                        ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                        : 'bg-warning/5 border-warning/20 hover:bg-warning/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Package className={`h-8 w-8 ${emailSent ? 'text-green-600' : 'text-warning'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{component.name}</p>
                          {emailSent && (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              <CheckCheck className="h-3 w-3 mr-1" />
                              Email Sent
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Category: {component.category}</p>
                        <p className="text-sm text-muted-foreground">
                          Supplier: {component.supplier_name} ({component.supplier_email})
                        </p>
                        {emailSent && statusInfo?.sentAt && (
                          <p className="text-xs text-green-600 mt-1">
                            Ordered {statusInfo.quantity || 'some'} units on {formatSentTime(statusInfo.sentAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant={emailSent ? "outline" : "default"} className={`font-bold ${
                        emailSent 
                          ? 'border-green-300 text-green-700' 
                          : 'border-warning text-warning'
                      }`}>
                        {emailSent ? 'ORDERED' : 'REORDER'}
                      </Badge>
                      <p className="text-sm font-mono">
                        <span className={emailSent ? "text-green-600 font-bold" : "text-warning font-bold"}>
                          {component.current_stock}
                        </span> / {component.min_stock} units
                      </p>
                      <p className={`text-xs font-semibold ${
                        emailSent ? "text-green-600" : "text-warning"
                      }`}>
                        {getStockPercentage(component.current_stock, component.min_stock)}% of minimum
                      </p>
                      <Button 
                        size="sm" 
                        variant={emailSent ? "outline" : "secondary"}
                        onClick={() => openCompose(component, 'reorder')}
                        disabled={composeLoading}
                      >
                        {emailSent ? 'Resend Order' : 'Preview & Send'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && criticalComponents.length === 0 && reorderComponents.length === 0 && (
        <Card className="border-success/20">
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-success mb-2">All Stock Levels Healthy</h3>
            <p className="text-muted-foreground">
              No automated alerts are currently being sent. All components are above minimum stock levels.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {composeLoading ? 'Loading...' : (emailStatus[composeComponent?.id || ''] ? 'Resend Purchase Order' : 'Review & Send Purchase Order')}
            </DialogTitle>
          </DialogHeader>

          {composeLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading email preview...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Subject</label>
                  <Input
                    placeholder="Email subject"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    onBlur={updateEmailPreview}
                    className="text-base"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Order Quantity</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={composeQuantity}
                      onChange={(e) => setComposeQuantity(Number(e.target.value))}
                      onBlur={updateEmailPreview}
                      className="text-base"
                      min="1"
                    />
                    <Button 
                      onClick={updateEmailPreview}
                      variant="outline"
                    >
                      Update
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adjust quantity before sending
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Additional Instructions</label>
                <Textarea
                  placeholder="Add special instructions or notes for the supplier (optional)"
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  onBlur={updateEmailPreview}
                  className="min-h-[80px]"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Purchase Order Preview</label>
                <div className="border rounded-lg bg-white shadow-sm">
                  <div className="border-b bg-muted/30 px-6 py-3">
                    <p className="text-xs text-muted-foreground">To: {composeComponent?.supplier_email}</p>
                    <p className="text-xs text-muted-foreground">Order Quantity: {composeQuantity} units</p>
                  </div>
                  <div
                    className="p-6 overflow-auto max-h-[400px]"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    dangerouslySetInnerHTML={{ __html: composeHtml }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Review the purchase order before sending to supplier
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setComposeOpen(false)} disabled={composeLoading}>
              Cancel
            </Button>
            <Button onClick={sendComposedEmail} disabled={composeLoading || !composeSubject || composeQuantity <= 0}>
              <Send className="h-4 w-4 mr-2" />
              {composeLoading ? 'Sending...' : `Send Order (${composeQuantity} units)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}