import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'warning' | 'critical' | 'success';
}

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  variant = 'default' 
}: MetricCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return 'border-warning/20 bg-warning/5';
      case 'critical':
        return 'border-critical/20 bg-critical/5';
      case 'success':
        return 'border-success/20 bg-success/5';
      default:
        return 'border-border bg-gradient-card';
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case 'warning':
        return 'text-warning';
      case 'critical':
        return 'text-critical';
      case 'success':
        return 'text-success';
      default:
        return 'text-primary';
    }
  };

  return (
    <Card className={cn('shadow-card hover:shadow-elevated transition-shadow', getVariantStyles())}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold text-foreground">
              {value}
            </p>
            {trend && (
              <p className={cn(
                'text-sm mt-1',
                trend.isPositive ? 'text-success' : 'text-critical'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </p>
            )}
          </div>
          <div className={cn(
            'p-3 rounded-lg',
            variant === 'default' ? 'bg-primary/10' : `bg-${variant}/10`
          )}>
            <Icon className={cn('h-6 w-6', getIconStyles())} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}