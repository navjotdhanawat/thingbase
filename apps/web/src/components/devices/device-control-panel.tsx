'use client';

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import {
    DeviceWidget,
    parseFields,
    getSensorFields,
    getControlFields,
    DeviceField,
} from './widgets';

interface DeviceControlPanelProps {
    deviceId: string;
    device: {
        id: string;
        name: string;
        status: string;
        type?: {
            id: string;
            name: string;
            schema?: Record<string, unknown>;
        };
    };
    deviceState: Record<string, unknown>;
    isSocketConnected?: boolean;
}

export function DeviceControlPanel({
    deviceId,
    device,
    deviceState,
    isSocketConnected = false,
}: DeviceControlPanelProps) {
    console.log('Device state:', deviceState);
    const queryClient = useQueryClient();

    // Parse schema fields
    const allFields = useMemo(() => {
        return parseFields(device.type?.schema);
    }, [device.type?.schema]);

    const sensorFields = useMemo(() => getSensorFields(allFields), [allFields]);
    const controlFields = useMemo(() => getControlFields(allFields), [allFields]);

    // Command mutation
    const sendCommandMutation = useMutation({
        mutationFn: (data: { key: string; value: unknown }) =>
            api.sendCommand({
                deviceId,
                type: 'set_state',
                payload: { [data.key]: data.value },
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['commands', deviceId] });
            // Note: State will update via WebSocket
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to send command');
        },
    });

    const handleControlChange = (key: string, value: unknown) => {
        sendCommandMutation.mutate({ key, value });

        // Show optimistic feedback
        toast.info(`Sending: ${key} = ${String(value)}`, {
            duration: 1500,
        });
    };

    const isOnline = device.status === 'online';

    // If no schema, don't render this panel
    if (allFields.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Sensors Section */}
            {sensorFields.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Sensors</CardTitle>
                            {isSocketConnected && (
                                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    Live
                                </div>
                            )}
                        </div>
                        <CardDescription>
                            Real-time sensor readings from the device
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {sensorFields.map((field) => (
                                <DeviceWidget
                                    key={field.key}
                                    field={field}
                                    value={deviceState[field.key]}
                                    isLoading={false}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Controls Section */}
            {controlFields.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Controls</CardTitle>
                        <CardDescription>
                            {isOnline
                                ? 'Control your device in real-time'
                                : 'Device is offline - commands will be queued'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {controlFields.map((field) => (
                                <DeviceWidget
                                    key={field.key}
                                    field={field}
                                    value={deviceState[field.key]}
                                    isLoading={sendCommandMutation.isPending}
                                    onControlChanged={handleControlChange}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
