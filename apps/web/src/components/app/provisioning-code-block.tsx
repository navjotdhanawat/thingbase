'use client';

import { useState } from 'react';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProvisioningCodeBlockProps {
  code: string;
  label?: string;
  masked?: boolean;
  language?: string;
  className?: string;
}

export function ProvisioningCodeBlock({
  code,
  label,
  masked = false,
  language = 'bash',
  className,
}: ProvisioningCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!masked);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const displayCode = revealed ? code : code.replace(/./g, '•');

  return (
    <div className={cn('rounded-lg border bg-muted/50 overflow-hidden', className)}>
      {label && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className="flex items-center gap-1">
            {masked && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setRevealed(!revealed)}
              >
                {revealed ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm">
        <code className={`language-${language}`}>{displayCode}</code>
      </pre>
    </div>
  );
}

