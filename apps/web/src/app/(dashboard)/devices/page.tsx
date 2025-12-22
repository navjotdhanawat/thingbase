'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Cpu, ArrowUpDown } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/app/data-table';
import { DeviceStatusPill } from '@/components/app/device-status-pill';
import { DeviceLastSeen } from '@/components/app/device-last-seen';
import { DeviceQuickActions } from '@/components/app/device-quick-actions';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { toast } from 'sonner';
import { useState } from 'react';

interface DeviceType {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

interface Device {
  id: string;
  name: string;
  externalId?: string;
  status: string;
  lastSeen?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  type?: DeviceType;
}

export default function DevicesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: () => api.getDevices(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Device deleted');
    },
    onError: (error: Error & { message?: string }) => {
      toast.error(error.message || 'Failed to delete device');
    },
  });

  const sendCommandMutation = useMutation({
    mutationFn: (data: { deviceId: string; type: string; payload: Record<string, unknown> }) =>
      api.sendCommand(data),
    onSuccess: () => {
      toast.success('Command sent');
    },
    onError: (error: Error & { message?: string }) => {
      toast.error(error.message || 'Failed to send command');
    },
  });

  // Filter devices by status
  const filteredDevices = devices?.filter((device) => {
    if (statusFilter === 'all') return true;
    return device.status === statusFilter;
  }) || [];

  const columns: ColumnDef<Device>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Device
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const deviceType = row.original.type;
        const iconMap: Record<string, string> = {
          thermometer: '🌡️', 'toggle-left': '🔘', waves: '💧', egg: '🥚',
          sprout: '🌱', cpu: '💻', zap: '⚡', gauge: '📊', activity: '📈',
        };
        const emoji = deviceType?.icon ? iconMap[deviceType.icon] || '📱' : undefined;
        
        return (
          <div className="flex items-center gap-3">
            <div 
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
              style={{ 
                backgroundColor: deviceType?.color ? `${deviceType.color}20` : undefined,
              }}
            >
              {emoji || <Cpu className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div>
              <div className="font-medium">{row.original.name}</div>
              <div className="text-xs text-muted-foreground">
                {deviceType?.name || row.original.externalId || row.original.id.slice(0, 8)}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <DeviceStatusPill status={row.original.status} />,
      filterFn: (row, id, value) => {
        if (value === 'all') return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: 'lastSeen',
      header: 'Last Seen',
      cell: ({ row }) => <DeviceLastSeen lastSeen={row.original.lastSeen} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DeviceQuickActions
          device={row.original}
          onView={() => router.push(`/devices/${row.original.id}`)}
          onSendCommand={(type, payload) =>
            sendCommandMutation.mutate({
              deviceId: row.original.id,
              type,
              payload,
            })
          }
          onDelete={() => deleteMutation.mutate(row.original.id)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        description="Manage and monitor your IoT devices"
        actions={
          <Button onClick={() => router.push('/provisioning')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        }
      />

      {!isLoading && (!devices || devices.length === 0) ? (
        <EmptyState
          icon={Cpu}
          title="No devices yet"
          description="Get started by provisioning your first IoT device to the platform."
          action={{
            label: 'Provision Device',
            onClick: () => router.push('/provisioning'),
            icon: Plus,
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredDevices}
          searchKey="name"
          searchPlaceholder="Search devices..."
          isLoading={isLoading}
          onRowClick={(device) => router.push(`/devices/${device.id}`)}
          filterComponent={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="provisioned">Provisioned</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      )}
    </div>
  );
}
