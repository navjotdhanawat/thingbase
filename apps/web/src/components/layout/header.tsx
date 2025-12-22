'use client';

import { Menu, Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  showMobileMenu?: boolean;
  className?: string;
}

export function Header({ title, onMenuClick, showMobileMenu = true, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-sm lg:px-6',
        className
      )}
    >
      {/* Mobile menu button */}
      {showMobileMenu && (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      )}

      {/* Page title */}
      {title && (
        <h1 className="text-lg font-semibold hidden lg:block">{title}</h1>
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-md hidden md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search devices, commands..."
          className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      <div className="flex-1 md:hidden" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          <span className="sr-only">Notifications</span>
        </Button>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

