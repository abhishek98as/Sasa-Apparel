import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface KpiCardProps {
    label: string;
    value: string | number;
    trend?: number; // percentage
    isCurrency?: boolean;
}

export function KpiCard({ label, value, trend, isCurrency }: KpiCardProps) {
    const formattedValue = isCurrency
        ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
        : value;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formattedValue}</div>
                {trend !== undefined && (
                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                        {trend > 0 ? <ArrowUp className="h-3 w-3 text-green-500 mr-1" /> :
                            trend < 0 ? <ArrowDown className="h-3 w-3 text-red-500 mr-1" /> :
                                <Minus className="h-3 w-3 mr-1" />}

                        <span className={trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : ""}>
                            {Math.abs(trend)}%
                        </span>
                        <span className="ml-1">from last period</span>
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
