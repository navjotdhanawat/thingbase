'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={className}>
      <ol className="flex items-center">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              'relative flex-1',
              index !== steps.length - 1 && 'pr-8 sm:pr-20'
            )}
          >
            <div className="flex items-center">
              <div
                className={cn(
                  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
                  index < currentStep
                    ? 'border-primary bg-primary text-primary-foreground'
                    : index === currentStep
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground/25 text-muted-foreground'
                )}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-5 left-10 -ml-px h-0.5 w-full',
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
            <div className="mt-3 hidden min-w-0 sm:block">
              <p
                className={cn(
                  'text-sm font-medium',
                  index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.title}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground">{step.description}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

