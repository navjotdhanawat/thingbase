'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownWidgetProps {
    label: string;
    value: string | null | undefined;
    options: string[];
    icon?: React.ReactNode;
    color?: string;
    isLoading?: boolean;
    onChange: (value: string) => void;
    className?: string;
}

export function DropdownWidget({
    label,
    value,
    options,
    icon,
    color,
    isLoading = false,
    onChange,
    className,
}: DropdownWidgetProps) {
    const currentValue = options.includes(value ?? '') ? value : options[0];

    const formatOption = (option: string): string => {
        return option
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .split(' ')
            .map((word) =>
                word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''
            )
            .join(' ');
    };

    return (
        <div
            className={cn(
                'rounded-xl bg-muted/50 p-4',
                className
            )}
        >
            {/* Header row */}
            <div className="flex items-center gap-2 mb-3">
                {icon && (
                    <span style={{ color }}>{icon}</span>
                )}
                <span className="font-medium flex-1 truncate">{label}</span>
                {isLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
            </div>

            {/* Select */}
            <Select
                value={currentValue ?? undefined}
                onValueChange={onChange}
                disabled={isLoading}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>
                            {formatOption(option)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
