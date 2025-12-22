'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  QrCode,
  Cpu,
  Key,
  Link as LinkIcon,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Stepper } from '@/components/app/stepper';
import { PageHeader } from '@/components/app/page-header';
import { ProvisioningCodeBlock } from '@/components/app/provisioning-code-block';
import { DeviceStatusPill } from '@/components/app/device-status-pill';
import { toast } from 'sonner';

const MQTT_BROKER_URL = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'mqtt://localhost:1883';

const deviceInfoSchema = z.object({
  name: z.string().min(1, 'Device name is required').max(255),
  externalId: z.string().max(255).optional(),
  typeId: z.string().uuid('Please select a device type'),
});

type DeviceInfoForm = z.infer<typeof deviceInfoSchema>;

interface DeviceType {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

const steps = [
  { id: 'info', title: 'Device Info', description: 'Basic details' },
  { id: 'credentials', title: 'Credentials', description: 'Generate token' },
  { id: 'connect', title: 'Connect', description: 'Setup guide' },
  { id: 'verify', title: 'Verify', description: 'Confirm online' },
];

interface CreatedDevice {
  id: string;
  name: string;
  externalId?: string;
  status: string;
}

interface ProvisionToken {
  token: string;
  expiresAt: string;
}

export default function ProvisioningPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [createdDevice, setCreatedDevice] = useState<CreatedDevice | null>(null);
  const [provisionToken, setProvisionToken] = useState<ProvisionToken | null>(null);

  const { data: deviceTypes } = useQuery<DeviceType[]>({
    queryKey: ['device-types'],
    queryFn: () => api.getDeviceTypes(),
  });

  const form = useForm<DeviceInfoForm>({
    resolver: zodResolver(deviceInfoSchema),
    defaultValues: {
      name: '',
      externalId: '',
      typeId: '',
    },
  });

  const createDeviceMutation = useMutation({
    mutationFn: (data: DeviceInfoForm) => api.createDevice(data),
    onSuccess: (device) => {
      setCreatedDevice(device);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Device created');
      setCurrentStep(1);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create device');
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: (deviceId: string) => api.generateProvisionToken(deviceId, 24),
    onSuccess: (token) => {
      setProvisionToken(token);
      toast.success('Provisioning token generated');
      setCurrentStep(2);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate token');
    },
  });

  // Poll for device status in verify step
  const { data: deviceStatus } = useQuery({
    queryKey: ['device', createdDevice?.id, 'status'],
    queryFn: async () => {
      if (!createdDevice?.id) return null;
      const device = await api.getDevice(createdDevice.id);
      return device;
    },
    enabled: currentStep === 3 && !!createdDevice?.id,
    refetchInterval: 2000,
  });

  const isDeviceOnline = deviceStatus?.status === 'online';

  const handleDeviceInfoSubmit = (data: DeviceInfoForm) => {
    createDeviceMutation.mutate(data);
  };

  const handleGenerateToken = () => {
    if (createdDevice?.id) {
      generateTokenMutation.mutate(createdDevice.id);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = () => {
    if (createdDevice?.id) {
      router.push(`/devices/${createdDevice.id}`);
    } else {
      router.push('/devices');
    }
  };

  const mqttConfig = createdDevice && provisionToken ? `{
  "broker": "${MQTT_BROKER_URL}",
  "deviceId": "${createdDevice.id}",
  "token": "${provisionToken.token}",
  "topics": {
    "telemetry": "t/{tenantId}/d/${createdDevice.id}/telemetry",
    "command": "t/{tenantId}/d/${createdDevice.id}/cmd",
    "ack": "t/{tenantId}/d/${createdDevice.id}/ack",
    "status": "t/{tenantId}/d/${createdDevice.id}/status"
  }
}` : '';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Device Provisioning"
        description="Add a new device to your IoT platform"
      />

      {/* Stepper */}
      <Stepper steps={steps} currentStep={currentStep} className="mb-8" />

      {/* Step Content */}
      <div className="max-w-2xl mx-auto">
        {/* Step 1: Device Info */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Cpu className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Device Information</CardTitle>
                  <CardDescription>
                    Enter the basic details for your new device
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleDeviceInfoSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="typeId">Device Type *</Label>
                  <Select
                    value={form.watch('typeId')}
                    onValueChange={(value) => form.setValue('typeId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a device type" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceTypes && deviceTypes.length > 0 ? (
                        deviceTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <span>{type.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          No device types available.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.typeId && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.typeId.message}
                    </p>
                  )}
                  {(!deviceTypes || deviceTypes.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      <a href="/device-types" className="text-primary underline">
                        Create a device type
                      </a>{' '}
                      before provisioning devices.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Device Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Living Room Sensor"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalId">External ID (optional)</Label>
                  <Input
                    id="externalId"
                    placeholder="e.g., sensor-001"
                    {...form.register('externalId')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Link this device to your existing system identifier
                  </p>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createDeviceMutation.isPending || !deviceTypes?.length}>
                    {createDeviceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Create & Continue
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Generate Credentials */}
        {currentStep === 1 && createdDevice && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Generate Credentials</CardTitle>
                  <CardDescription>
                    Create a provisioning token for {createdDevice.name}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{createdDevice.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ID: {createdDevice.id.slice(0, 8)}
                    </p>
                  </div>
                  <DeviceStatusPill status={createdDevice.status} />
                </div>
              </div>

              <div className="text-center py-4">
                <Button
                  size="lg"
                  onClick={handleGenerateToken}
                  disabled={generateTokenMutation.isPending}
                >
                  {generateTokenMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4 mr-2" />
                  )}
                  Generate Provisioning Token
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Token will be valid for 24 hours
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Connection Instructions */}
        {currentStep === 2 && createdDevice && provisionToken && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <LinkIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Connect Your Device</CardTitle>
                  <CardDescription>
                    Use these credentials to connect your device
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProvisioningCodeBlock
                label="MQTT Broker"
                code={MQTT_BROKER_URL}
              />

              <ProvisioningCodeBlock
                label="Device ID"
                code={createdDevice.id}
              />

              <ProvisioningCodeBlock
                label="Provisioning Token"
                code={provisionToken.token}
                masked
              />

              <ProvisioningCodeBlock
                label="Full Configuration (JSON)"
                code={mqttConfig}
                language="json"
              />

              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <p className="text-sm text-warning">
                  <strong>Important:</strong> Save these credentials securely. The token expires on{' '}
                  {new Date(provisionToken.expiresAt).toLocaleString()}.
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext}>
                  Continue to Verify
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Verify Connection */}
        {currentStep === 3 && createdDevice && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Verify Connection</CardTitle>
                  <CardDescription>
                    Waiting for {createdDevice.name} to come online
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center py-8">
                {isDeviceOnline ? (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-4">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="text-lg font-semibold text-success">Device Connected!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your device is now online and ready to use
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                      <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold">Waiting for device...</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Connect your device using the credentials from the previous step
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{createdDevice.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ID: {createdDevice.id.slice(0, 8)}
                    </p>
                  </div>
                  <DeviceStatusPill status={deviceStatus?.status || 'provisioned'} />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleFinish}>
                  {isDeviceOnline ? 'View Device' : 'Skip & Finish'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

