import { useState, useEffect } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Activity, Filter } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

interface Component {
  id: string;
  name: string;
}

interface UsageData {
  date: string;
  total: number;
  componentName: string;
}

export default function Analytics() {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [demandData, setDemandData] = useState<any[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComponents();
  }, []);

  useEffect(() => {
    if (components.length > 0) {
      fetchAnalyticsData();
    }
  }, [selectedComponent, components]);

  const fetchComponents = async () => {
    const { data } = await supabase
      .from('components')
      .select('id, name')
      .order('name');
    
    if (data) {
      setComponents(data);
    }
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    
    // Fetch usage history for the last 30 days
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    
    let query = supabase
      .from('usage_history')
      .select('date, units_used, components(name)')
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: true });

    // Filter by component if selected
    if (selectedComponent !== 'all') {
      query = query.eq('component_id', selectedComponent);
    }

    const { data: usage } = await query;

    if (usage) {
      // Aggregate usage by date
      const aggregated = usage.reduce((acc: any[], curr: any) => {
        const existing = acc.find((item: any) => item.date === curr.date);
        if (existing) {
          existing.total += curr.units_used;
        } else {
          acc.push({ 
            date: format(new Date(curr.date), 'MMM dd'), 
            total: curr.units_used,
            componentName: curr.components?.name || 'Unknown'
          });
        }
        return acc;
      }, []);

      setUsageData(aggregated);

      // Create demand forecast based on actual usage trends
      if (aggregated.length > 0) {
        const recentAvg = aggregated.slice(-7).reduce((sum: number, item: any) => sum + item.total, 0) / 7;
        const forecast = [];
        
        for (let i = 1; i <= 7; i++) {
          const futureDate = format(subDays(new Date(), -i), 'MMM dd');
          // Add some realistic variation based on historical patterns
          const variation = aggregated.length > 14 ? 
            (aggregated[aggregated.length - 1].total - aggregated[aggregated.length - 8].total) / aggregated[aggregated.length - 8].total : 0;
          
          forecast.push({
            date: futureDate,
            projected: Math.round(recentAvg * (1 + variation * 0.7)),
          });
        }
        setDemandData(forecast);
      }
    }
    
    setLoading(false);
  };

  const chartConfig = {
    total: {
      label: "Units Used",
      color: "hsl(var(--primary))",
    },
    projected: {
      label: "Projected Demand",
      color: "hsl(var(--success))",
    },
  };

  const getSelectedComponentName = () => {
    if (selectedComponent === 'all') return 'All Components';
    const component = components.find(c => c.id === selectedComponent);
    return component?.name || 'Selected Component';
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Navigation />
      
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Analytics & Forecasting
            </h1>
            <p className="text-muted-foreground">
              Real-time inventory insights and demand forecasting
            </p>
          </div>
          
          <Select value={selectedComponent} onValueChange={setSelectedComponent}>
            <SelectTrigger className="w-64">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by component" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Components</SelectItem>
              {components.map((component) => (
                <SelectItem key={component.id} value={component.id}>
                  {component.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Demand Forecasting */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Demand Forecast - {getSelectedComponentName()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground">Loading forecast data...</p>
                </div>
              ) : demandData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demandData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="projected" 
                        fill="hsl(var(--success))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground">No forecast data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Patterns */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Usage Patterns - {getSelectedComponentName()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground">Loading usage data...</p>
                </div>
              ) : usageData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={usageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground">No usage data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Current Stock Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {components.slice(0, 3).map((component) => (
                  <div key={component.id} className="flex items-center justify-between">
                    <span className="text-sm truncate">{component.name}</span>
                    <span className="text-sm font-medium text-muted-foreground">
                      View Details
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Usage Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Total Usage (30 days)</span>
                  <span className="text-sm font-medium">
                    {usageData.reduce((sum, item) => sum + item.total, 0)} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Average Daily</span>
                  <span className="text-sm font-medium">
                    {usageData.length > 0 ? Math.round(usageData.reduce((sum, item) => sum + item.total, 0) / usageData.length) : 0} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tracking Period</span>
                  <span className="text-sm font-medium">{usageData.length} days</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Forecast Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Next 7 Days</span>
                  <span className="text-sm font-medium">
                    {demandData.reduce((sum, item) => sum + item.projected, 0)} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Daily Average</span>
                  <span className="text-sm font-medium">
                    {demandData.length > 0 ? Math.round(demandData.reduce((sum, item) => sum + item.projected, 0) / demandData.length) : 0} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Trend</span>
                  <span className="text-sm font-medium text-success">
                    {demandData.length > 1 ? 
                      (demandData[demandData.length - 1].projected > demandData[0].projected ? '↑ Increasing' : '↓ Stable') : 
                      'No data'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}