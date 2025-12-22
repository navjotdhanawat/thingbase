'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwitchWidgetProps {
    label: string;
    value: boolean;
    icon?: React.ReactNode;
    color?: string;
    isLoading?: boolean;
    onChange: (value: boolean) => void;
    className?: string;
}

export function SwitchWidget({
    label,
    value,
    icon,
    color,
    isLoading = false,
    onChange,
    className,
}: SwitchWidgetProps) {
    const [optimisticValue, setOptimisticValue] = useState(value);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        if (!isPending) {
            setOptimisticValue(value);
        }
        if (isPending && value === optimisticValue) {
            setIsPending(false);
        }
    }, [value, isPending, optimisticValue]);

    const handleChange = (newValue: boolean) => {
        setOptimisticValue(newValue);
        setIsPending(true);
        onChange(newValue);
    };

    const isOn = optimisticValue;

    return (
        <div
            className={cn(
                'rounded-xl bg-muted/50 p-4 flex items-center gap-4',
                isOn && 'ring-1 ring-primary/30',
                className
            )}
        >
            {icon && (
                <div
                    className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-lg',
                        isOn ? 'bg-primary/15' : 'bg-muted-foreground/10'
                    )}
                    style={{ color: isOn ? color : undefined }}
                >
                    {icon}
                </div>
            )}

            <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{label}</p>
                <p
                    className={cn(
                        'text-sm font-medium',
                        isOn ? 'text-primary' : 'text-muted-foreground'
                    )}
                    style={{ color: isOn ? color : undefined }}
                >
                    {isOn ? 'ON' : 'OFF'}
                </p>
            </div>

            {(isLoading || isPending) && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}

            <Switch
                checked={optimisticValue}
                onCheckedChange={handleChange}
                disabled={isLoading}
            />
        </div>
    );
}
