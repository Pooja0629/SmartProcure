import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, MessageCircle, Send, User, Search } from 'lucide-react';
import { format } from 'date-fns';

interface Supplier {
  id: string;
  name: string;
  email: string;
}

interface SupplierMessage {
  id: string;
  supplier_id: string;
  message: string;
  message_type: 'outgoing' | 'incoming';
  created_at: string;
  suppliers?: Supplier;
}

export function SupplierResponsesTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [messages, setMessages] = useState<SupplierMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Load suppliers when component mounts
  useEffect(() => {
    loadSuppliers();
  }, []);

  // Load messages and set up real-time for selected supplier
  useEffect(() => {
    if (selectedSupplier) {
      loadMessages(selectedSupplier.id);
      // Set up real-time subscription for this supplier
      const subscription = supabase
        .channel('supplier-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'supplier_messages',
            filter: `supplier_id=eq.${selectedSupplier.id}`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as SupplierMessage]);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedSupplier]);

  // Global incoming message subscription
  useEffect(() => {
    const subscription = supabase
      .channel('new-supplier-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'supplier_messages',
          filter: 'message_type=eq.incoming'
        },
        (payload) => {
          const newMessage = payload.new as SupplierMessage;
          
          // If this message is from the currently selected supplier, add it to the chat
          if (selectedSupplier?.id === newMessage.supplier_id) {
            setMessages(prev => [...prev, newMessage]);
          }
          
          // Show notification for new messages
          toast({
            title: 'New message received',
            description: `From: ${newMessage.suppliers?.name}`,
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedSupplier]);

  const loadSuppliers = async () => {
    try {
      console.log('🔄 Loading suppliers...');
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, email')
        .order('name');

      if (error) {
        console.error('❌ Supplier load error:', error);
        throw error;
      }

      console.log('✅ Suppliers loaded:', data);
      setSuppliers(data || []);

    } catch (error: any) {
      console.error('💥 Error loading suppliers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load suppliers: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from('supplier_messages')
        .select(`
          *,
          suppliers(name, email)
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedSupplier || !newMessage.trim()) return;

    try {
      // Save message to database
      const { error: dbError } = await supabase
        .from('supplier_messages')
        .insert({
          supplier_id: selectedSupplier.id,
          message: newMessage.trim(),
          message_type: 'outgoing'
        });

      if (dbError) throw dbError;

      // Send email to supplier
      const { error: emailError } = await supabase.functions.invoke('send-supplier-message', {
        body: {
          to: selectedSupplier.email,
          subject: `Message from Procurement Team`,
          message: newMessage.trim()
        }
      });

      if (emailError) {
        console.warn('Email sending failed, but message saved:', emailError);
        // Don't throw error - message is saved locally even if email fails
      }

      setNewMessage('');
      
      toast({
        title: 'Message sent',
        description: `Message sent to ${selectedSupplier.name}`,
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const addIncomingMessage = async (supplierId: string, message: string) => {
    try {
      const { error } = await supabase
        .from('supplier_messages')
        .insert({
          supplier_id: supplierId,
          message: message,
          message_type: 'incoming'
        });

      if (error) throw error;

      toast({
        title: 'Message recorded',
        description: 'Incoming message has been saved',
      });

      if (selectedSupplier?.id === supplierId) {
        loadMessages(supplierId);
      }
    } catch (error: any) {
      console.error('Error saving incoming message:', error);
      toast({
        title: 'Error',
        description: 'Failed to save incoming message',
        variant: 'destructive',
      });
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Supplier Messages</h2>
          <p className="text-muted-foreground">
            Direct messaging with your suppliers
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Supplier Messages</h2>
        <p className="text-muted-foreground">
          Direct messaging with your suppliers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Supplier List */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedSupplier?.id === supplier.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedSupplier(supplier)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{supplier.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Chat Area */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex-1 flex flex-col">
            {selectedSupplier ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedSupplier.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedSupplier.email}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[400px]">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm">Start a conversation with {selectedSupplier.name}</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.message_type === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.message_type === 'outgoing'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                            message.message_type === 'outgoing' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {format(new Date(message.created_at), 'hh:mm a')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={`Type a message to ${selectedSupplier.name}...`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      rows={2}
                      className="resize-none"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a supplier to start messaging</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button 
          variant="outline" 
          onClick={() => {
            const supplier = suppliers[0];
            if (supplier) {
              setSelectedSupplier(supplier);
            }
          }}
        >
          Quick Message
        </Button>
        
        <AddIncomingMessageDialog 
          suppliers={suppliers} 
          onAddMessage={addIncomingMessage} 
        />
      </div>
    </div>
  );
}

// Enhanced Component for adding incoming messages with AI assistance
function AddIncomingMessageDialog({ suppliers, onAddMessage }: { 
  suppliers: Supplier[]; 
  onAddMessage: (supplierId: string, message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [detectedSupplier, setDetectedSupplier] = useState<Supplier | null>(null);

  // Auto-detect supplier from email content
  useEffect(() => {
    if (emailContent) {
      const detectedEmail = extractEmailFromText(emailContent);
      if (detectedEmail) {
        const foundSupplier = suppliers.find(s => 
          s.email.toLowerCase().includes(detectedEmail.toLowerCase()) ||
          emailContent.toLowerCase().includes(s.name.toLowerCase())
        );
        setDetectedSupplier(foundSupplier || null);
      }
    }
  }, [emailContent, suppliers]);

  const extractEmailFromText = (text: string): string | null => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  };

  const extractMessageContent = (text: string): string => {
    // Remove email headers and signatures
    const lines = text.split('\n').filter(line => 
      !line.startsWith('From:') &&
      !line.startsWith('To:') &&
      !line.startsWith('Subject:') &&
      !line.startsWith('Date:') &&
      !line.includes('@') && // Basic signature detection
      line.trim().length > 0
    );
    return lines.join('\n').trim();
  };

  const handlePasteEmail = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setEmailContent(clipboardText);
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  };

  const handleSubmit = () => {
    if (detectedSupplier && emailContent.trim()) {
      const cleanMessage = extractMessageContent(emailContent);
      onAddMessage(detectedSupplier.id, cleanMessage);
      setOpen(false);
      setEmailContent('');
      setDetectedSupplier(null);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Mail className="h-4 w-4 mr-2" />
        Add Incoming Message
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Incoming Message (Smart Detection)</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePasteEmail}>
                Paste Email Content
              </Button>
              <p className="text-sm text-muted-foreground flex items-center">
                Paste the entire email and we'll auto-detect the supplier
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Email Content</label>
              <Textarea
                placeholder="Paste the entire email content here..."
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                rows={8}
              />
            </div>

            {detectedSupplier && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">
                  ✅ Supplier detected: {detectedSupplier.name}
                </p>
                <p className="text-xs text-green-600">{detectedSupplier.email}</p>
              </div>
            )}

            {emailContent && !detectedSupplier && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Could not auto-detect supplier. Please select manually:
                </p>
                <select 
                  className="w-full p-2 border rounded-md mt-2"
                  onChange={(e) => {
                    const supplier = suppliers.find(s => s.id === e.target.value);
                    setDetectedSupplier(supplier || null);
                  }}
                >
                  <option value="">Select supplier manually</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!detectedSupplier || !emailContent.trim()}
            >
              Save Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}