import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/layout/Navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface EmailHistoryItem {
  id: string;
  component_id: string;
  supplier_id: string;
  alert_type: string;
  subject: string;
  email_body: string;
  sent_to: string;
  status: 'sent' | 'delivered' | 'opened' | 'failed';
  modified_by_manager: boolean;
  original_quantity: number | null;
  final_quantity: number | null;
  created_at: string;
  sent_at: string;
  components?: {
    name: string;
    category: string;
  };
  suppliers?: {
    name: string;
  };
}

export default function EmailHistory() {
  const [emails, setEmails] = useState<EmailHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmailHistory();
  }, []);

  const fetchEmailHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('email_history')
        .select(`
          *,
          components(name, category),
          suppliers(name)
        `)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setEmails((data || []) as EmailHistoryItem[]);
    } catch (error: any) {
      console.error('Error fetching email history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'opened':
        return <Mail className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getAlertTypeBadge = (type: string) => {
    switch (type) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'reorder':
        return <Badge className="bg-blue-500">Reorder</Badge>;
      case 'low_stock':
        return <Badge className="bg-yellow-500">Low Stock</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Email History</h1>
          <p className="text-muted-foreground">
            Track all automated and manual email alerts sent to suppliers
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading email history...</p>
          </div>
        ) : emails.length === 0 ? (
          <Card className="p-12 text-center">
            <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Emails Sent Yet</h3>
            <p className="text-muted-foreground">
              Email history will appear here once alerts are sent to suppliers
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {emails.map((email) => (
              <Card key={email.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{email.subject}</h3>
                      {getAlertTypeBadge(email.alert_type)}
                      {email.modified_by_manager && (
                        <Badge variant="outline" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Modified
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium">Component:</span> {email.components?.name || 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Supplier:</span> {email.suppliers?.name || 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Sent to:</span> {email.sent_to}
                      </p>
                      {email.final_quantity && (
                        <p>
                          <span className="font-medium">Quantity:</span> {email.final_quantity} units
                          {email.modified_by_manager && email.original_quantity && (
                            <span className="text-yellow-600">
                              {' '}(adjusted from {email.original_quantity})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(email.status)}
                      <span className="text-sm font-medium capitalize">{email.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(email.sent_at), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(email.sent_at), 'hh:mm a')}
                    </p>
                  </div>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    View Email Content
                  </summary>
                  <div 
                    className="mt-4 p-4 bg-muted rounded-md text-sm overflow-auto max-h-96"
                    dangerouslySetInnerHTML={{ __html: email.email_body }}
                  />
                </details>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
