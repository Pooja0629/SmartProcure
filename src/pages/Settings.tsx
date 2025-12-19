import { useState, useEffect } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Mail, 
  Shield, 
  Database,
  Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  
  // Email Settings
  const [senderEmail, setSenderEmail] = useState('inventory@company.com');
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [criticalThreshold, setCriticalThreshold] = useState(50);
  const [reorderThreshold, setReorderThreshold] = useState(100);
  const [lowStockThreshold, setLowStockThreshold] = useState(150);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSenderEmail(data.sender_email);
        setAutoSendEnabled(data.auto_send_enabled);
        setCriticalThreshold(data.critical_threshold_percent);
        setReorderThreshold(data.reorder_threshold_percent);
        setLowStockThreshold(data.low_stock_threshold_percent);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to save settings',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('email_settings')
        .upsert({
          user_id: user.id,
          sender_email: senderEmail,
          auto_send_enabled: autoSendEnabled,
          critical_threshold_percent: criticalThreshold,
          reorder_threshold_percent: reorderThreshold,
          low_stock_threshold_percent: lowStockThreshold,
        });

      if (error) throw error;

      toast({
        title: 'Settings Saved',
        description: 'Your email settings have been updated successfully',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Navigation />
      
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your inventory management system preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email alerts for inventory events</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Critical Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">Immediate alerts for critically low inventory</p>
                </div>
                <Switch checked={criticalAlerts} onCheckedChange={setCriticalAlerts} />
              </div>
            </CardContent>
          </Card>

          {/* Email Configuration */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sender-email">Sender Email</Label>
                <Input 
                  id="sender-email" 
                  type="email" 
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="inventory@company.com" 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-send">Automated Email Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically send emails without manager review
                  </p>
                </div>
                <Switch
                  id="auto-send"
                  checked={autoSendEnabled}
                  onCheckedChange={setAutoSendEnabled}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Alert Thresholds</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="critical-threshold">Critical Alert Threshold</Label>
                    <span className="text-sm text-muted-foreground">{criticalThreshold}%</span>
                  </div>
                  <Input 
                    id="critical-threshold" 
                    type="number" 
                    min="0"
                    max="100"
                    value={criticalThreshold}
                    onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Trigger critical alert when stock falls below this % of minimum
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="reorder-threshold">Reorder Alert Threshold</Label>
                    <span className="text-sm text-muted-foreground">{reorderThreshold}%</span>
                  </div>
                  <Input 
                    id="reorder-threshold" 
                    type="number" 
                    min="0"
                    max="200"
                    value={reorderThreshold}
                    onChange={(e) => setReorderThreshold(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Trigger reorder alert at this % of minimum stock
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="low-stock-threshold">Low Stock Warning Threshold</Label>
                    <span className="text-sm text-muted-foreground">{lowStockThreshold}%</span>
                  </div>
                  <Input 
                    id="low-stock-threshold" 
                    type="number" 
                    min="0"
                    max="200"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Early warning when stock is at this % of minimum
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
                Inventory Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="safety-stock">Safety Stock Multiplier</Label>
                <Input 
                  id="safety-stock" 
                  placeholder="1.65" 
                  defaultValue="1.65"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for calculating safety stock levels (95% service level)
                </p>
              </div>
              
              <div>
                <Label htmlFor="reorder-threshold">Default Reorder Threshold (%)</Label>
                <Input 
                  id="reorder-threshold" 
                  placeholder="20" 
                  defaultValue="20"
                />
              </div>
              
              <div>
                <Label htmlFor="forecast-period">Forecasting Period (days)</Label>
                <Input 
                  id="forecast-period" 
                  placeholder="90" 
                  defaultValue="90"
                />
              </div>
              
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input 
                  id="currency" 
                  placeholder="INR" 
                  defaultValue="INR"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Security & Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                </div>
                <Switch />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Separator />
              
              <div>
                <Label htmlFor="session-duration">Session Duration (hours)</Label>
                <Input 
                  id="session-duration" 
                  placeholder="8" 
                  defaultValue="8"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button 
            size="lg" 
            className="gap-2"
            onClick={saveSettings}
            disabled={loading}
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
      </main>
    </div>
  );
}
