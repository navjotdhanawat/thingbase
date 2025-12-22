'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonWidgetProps {
    label: string;
    icon?: React.ReactNode;
    color?: string;
    isLoading?: boolean;
    onPress: () => void;
    className?: string;
}

export function ButtonWidget({
    label,
    icon,
    color,
    isLoading = false,
    onPress,
    className,
}: ButtonWidgetProps) {
    const [isPending, setIsPending] = useState(false);

    const handleClick = () => {
        if (isPending || isLoading) return;

        setIsPending(true);
        onPress();

        // Reset pending state after a delay
        setTimeout(() => {
            setIsPending(false);
        }, 2000);
    };

    const loading = isLoading || isPending;

    return (
        <Button
            variant="outline"
            onClick={handleClick}
            disabled={loading}
            className={cn(
                'h-auto py-3 px-4 flex items-center gap-2',
                className
            )}
            style={{
                borderColor: color ? `${color}40` : undefined,
                backgroundColor: color ? `${color}10` : undefined,
                color: color,
            }}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                icon
            )}
            <span className="font-medium">{label}</span>
        </Button>
    );
}
