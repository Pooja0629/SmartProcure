import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Mail, AlertTriangle, Package, CheckCircle, Clock, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Component {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  min_stock: number;
  suppliers: {
    name: string;
    email: string;
  } | null;
}

export function EmailAlertsTab() {
  const [criticalComponents, setCriticalComponents] = useState<Component[]>([]);
  const [reorderComponents, setReorderComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeHtml, setComposeHtml] = useState('');
  const [composeType, setComposeType] = useState<null | 'critical' | 'reorder'>(null);
  const [composeComponent, setComposeComponent] = useState<Component | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadComponents();

    const channel = supabase
      .channel('component-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'components' }, () => {
        loadComponents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadComponents = async () => {
    try {
      const { data, error } = await supabase
        .from('components')
        .select('*, suppliers(*)')
        .order('current_stock', { ascending: true });

      if (error) throw error;

      const critical: Component[] = [];
      const reorder: Component[] = [];

      data?.forEach((component) => {
        if (component.current_stock < component.min_stock * 0.5) {
          critical.push(component);
        } else if (component.current_stock <= component.min_stock) {
          reorder.push(component);
        }
      });

      setCriticalComponents(critical);
      setReorderComponents(reorder);
    } catch (error) {
      console.error('Error loading components:', error);
      toast({
        title: 'Error',
        description: 'Failed to load component data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStockPercentage = (current: number, min: number) => {
    return ((current / min) * 100).toFixed(1);
  };

  const sendAlert = async (componentId: string, alertType: 'critical' | 'reorder') => {
    try {
      const { error } = await supabase.functions.invoke('send-supplier-alert', {
        body: { componentId, alertType }
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to send alert:', error);
      return false;
    }
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

  const openCompose = async (component: Component, type: 'critical' | 'reorder') => {
    try {
      setComposeLoading(true);
      setComposeComponent(component);
      setComposeType(type);
      setComposeOpen(true);

      const { data, error } = await supabase.functions.invoke('send-supplier-alert', {
        body: { componentId: component.id, alertType: type, previewOnly: true }
      });

      if (error) throw error;

      setComposeSubject(data?.emailContent?.subject || '');
      setComposeHtml(data?.emailContent?.html || '');
    } catch (err) {
      console.error('Failed to load template preview', err);
      toast({ title: 'Preview failed', description: 'Could not load email template', variant: 'destructive' });
      setComposeOpen(false);
    } finally {
      setComposeLoading(false);
    }
  };

  const sendComposedEmail = async () => {
    if (!composeComponent || !composeType) return;
    try {
      setComposeLoading(true);
      const { error } = await supabase.functions.invoke('send-supplier-alert', {
        body: {
          componentId: composeComponent.id,
          alertType: composeType,
          subject: composeSubject,
          html: composeHtml,
        }
      });
      if (error) throw error;
      toast({ title: 'Email sent', description: `Alert sent to ${composeComponent.suppliers?.email}` });
      setComposeOpen(false);
    } catch (err) {
      console.error('Send failed', err);
      toast({ title: 'Send failed', description: 'Could not send email', variant: 'destructive' });
    } finally {
      setComposeLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              These components are below 50% of minimum stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criticalComponents.map((component) => (
                <div
                  key={component.id}
                  className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20 rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Package className="h-8 w-8 text-destructive" />
                    <div>
                      <p className="font-semibold">{component.name}</p>
                      <p className="text-sm text-muted-foreground">Category: {component.category}</p>
                      <p className="text-sm text-muted-foreground">
                        Supplier: {component.suppliers?.name || 'No supplier'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="destructive" className="font-bold">CRITICAL</Badge>
                    <p className="text-sm font-mono">
                      <span className="text-destructive font-bold">{component.current_stock}</span> / {component.min_stock} units
                    </p>
                    <p className="text-xs text-destructive font-semibold">
                      {getStockPercentage(component.current_stock, component.min_stock)}% of minimum
                    </p>
                    <Button size="sm" variant="destructive" onClick={() => openCompose(component, 'critical')}>
                      Preview & Send
                    </Button>
                  </div>
                </div>
              ))}
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
              These components are at or below minimum stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reorderComponents.map((component) => (
                <div
                  key={component.id}
                  className="flex items-center justify-between p-4 bg-warning/5 border border-warning/20 rounded-lg hover:bg-warning/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Package className="h-8 w-8 text-warning" />
                    <div>
                      <p className="font-semibold">{component.name}</p>
                      <p className="text-sm text-muted-foreground">Category: {component.category}</p>
                      <p className="text-sm text-muted-foreground">
                        Supplier: {component.suppliers?.name || 'No supplier'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="outline" className="border-warning text-warning font-bold">REORDER</Badge>
                    <p className="text-sm font-mono">
                      <span className="text-warning font-bold">{component.current_stock}</span> / {component.min_stock} units
                    </p>
                    <p className="text-xs text-warning font-semibold">
                      {getStockPercentage(component.current_stock, component.min_stock)}% of minimum
                    </p>
                    <Button size="sm" variant="secondary" onClick={() => openCompose(component, 'reorder')}>
                      Preview & Send
                    </Button>
                  </div>
                </div>
              ))}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview & Edit Email to Supplier</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Subject</label>
              <Input
                placeholder="Email subject"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                disabled={composeLoading}
                className="text-base"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Email Preview</label>
              <div className="border rounded-lg bg-white shadow-sm">
                <div className="border-b bg-muted/30 px-6 py-3">
                  <p className="text-xs text-muted-foreground">To: {composeComponent?.suppliers?.email}</p>
                </div>
                <div
                  className="p-6 overflow-auto max-h-[400px]"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  dangerouslySetInnerHTML={{ __html: composeHtml }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Preview of the email that will be sent to the supplier. Edit the subject above if needed.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setComposeOpen(false)} disabled={composeLoading}>
              Cancel
            </Button>
            <Button onClick={sendComposedEmail} disabled={composeLoading || !composeSubject || !composeHtml}>
              <Send className="h-4 w-4 mr-2" />
              {composeLoading ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
