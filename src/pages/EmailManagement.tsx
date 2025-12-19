import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation } from '@/components/layout/Navigation';
import { EmailAlertsFixed } from '@/components/EmailAlertsFixed';
import { SupplierResponsesTab } from '@/components/email/SupplierResponsesTab'; // We'll create this

export default function EmailManagement() {
  return (
    <div className="flex min-h-screen bg-background">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Email Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage supplier communications and track responses
            </p>
          </div>

          <Tabs defaultValue="alerts" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
              <TabsTrigger value="responses">Supplier Responses</TabsTrigger>
            </TabsList>
            
            <TabsContent value="alerts" className="space-y-6 mt-6">
              <EmailAlertsFixed />
            </TabsContent>
            
            <TabsContent value="responses" className="space-y-6 mt-6">
              <SupplierResponsesTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}