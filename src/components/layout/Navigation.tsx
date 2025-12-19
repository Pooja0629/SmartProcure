import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Building2, 
  History, 
  ShoppingCart, 
  BarChart3,
  Mail,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const navigationItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Components', href: '/components', icon: Package },
  { name: 'Suppliers', href: '/suppliers', icon: Building2 },
  { name: 'Procurement', href: '/procurement', icon: ShoppingCart },
  { name: 'Usage History', href: '/usage', icon: History },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Email Management', href: '/email-management', icon: Mail },
  // 🚨 REMOVED: Settings item deleted from array
];

export function Navigation() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <nav className="bg-card border-r border-border min-h-screen w-64 p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          InventoryAI
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Electronics Manufacturing
        </p>
      </div>
      
      <div className="space-y-2 flex-1">
        {navigationItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </div>

      <div className="mt-auto pt-6 border-t border-border">
        <Button 
          variant="outline" 
          className="w-full gap-2 text-muted-foreground hover:text-destructive" 
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </nav>
  );
}