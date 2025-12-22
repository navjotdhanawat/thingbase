'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Cpu,
  Users,
  Settings,
  QrCode,
  Terminal,
  ScrollText,
  Bell,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NavItem } from './nav-item';
import { Separator } from '@/components/ui/separator';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Device Types', href: '/device-types', icon: Layers },
  { name: 'Devices', href: '/devices', icon: Cpu },
  { name: 'Provisioning', href: '/provisioning', icon: QrCode },
  { name: 'Commands', href: '/commands', icon: Terminal },
  { name: 'Alerts', href: '/alerts', icon: Bell },
];

const secondaryNavigation = [
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Audit Logs', href: '/audit', icon: ScrollText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

export function Sidebar({ collapsed = false, onCollapsedChange, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-16 items-center border-b border-sidebar-border px-4',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg text-sidebar-foreground">
              IoT Platform
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.name}
              collapsed={collapsed}
            />
          ))}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          {secondaryNavigation.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.name}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      {/* Collapse Toggle */}
      {onCollapsedChange && (
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-center text-muted-foreground',
              !collapsed && 'justify-start'
            )}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Collapse
              </>
            )}
          </Button>
        </div>
      )}
    </aside>
  );
}

