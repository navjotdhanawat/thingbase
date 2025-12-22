'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Cpu, Trash2, Settings, Download, X, GripVertical } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';

interface FieldFormData {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'string' | 'enum';
  unit?: string;
  icon?: string;
  color?: string;
  chartType?: 'line' | 'bar' | 'gauge' | 'boolean';
}

interface DeviceTypeFormData {
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  fields: FieldFormData[];
}

const ICON_OPTIONS = [
  { value: 'cpu', label: '💻 CPU/Generic' },
  { value: 'thermometer', label: '🌡️ Thermometer' },
  { value: 'droplets', label: '💧 Droplets' },
  { value: 'waves', label: '🌊 Waves' },
  { value: 'zap', label: '⚡ Electric' },
  { value: 'toggle-left', label: '🔘 Switch' },
  { value: 'egg', label: '🥚 Egg' },
  { value: 'sprout', label: '🌱 Plant' },
  { value: 'gauge', label: '📊 Gauge' },
  { value: 'activity', label: '📈 Activity' },
  { value: 'flame', label: '🔥 Flame' },
  { value: 'wind', label: '💨 Wind' },
  { value: 'sun', label: '☀️ Sun' },
  { value: 'moon', label: '🌙 Moon' },
  { value: 'battery', label: '🔋 Battery' },
  { value: 'wifi', label: '📶 WiFi' },
];

const COLOR_OPTIONS = [
  { value: '#f97316', label: 'Orange' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#22c55e', label: 'Green' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#ef4444', label: 'Red' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#14b8a6', label: 'Teal' },
];

const FIELD_TYPE_OPTIONS = [
  { value: 'number', label: 'Number', description: 'Numeric values (temperature, pressure, etc.)' },
  { value: 'boolean', label: 'Boolean', description: 'On/Off, True/False values' },
  { value: 'string', label: 'String', description: 'Text values' },
  { value: 'enum', label: 'Enum', description: 'Predefined options (mode, status, etc.)' },
];

const CHART_TYPE_OPTIONS = [
  { value: 'line', label: 'Line Chart' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'gauge', label: 'Gauge' },
  { value: 'boolean', label: 'Boolean (On/Off)' },
];

export default function DeviceTypesPage() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [deleteType, setDeleteType] = useState<{ id: string; name: string } | null>(null);

  const { data: deviceTypes, isLoading } = useQuery({
    queryKey: ['device-types'],
    queryFn: () => api.getDeviceTypes(),
  });

  const { data: presets, isLoading: presetsLoading } = useQuery({
    queryKey: ['device-type-presets'],
    queryFn: () => api.getAvailablePresets(),
    enabled: showAddDialog,
  });

  const form = useForm<DeviceTypeFormData>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      icon: 'cpu',
      color: '#6366f1',
      fields: [
        { key: '', label: '', type: 'number', unit: '', chartType: 'line' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'fields',
  });

  const createFromPresetMutation = useMutation({
    mutationFn: (slug: string) => api.createDeviceTypeFromPreset(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-types'] });
      queryClient.invalidateQueries({ queryKey: ['device-type-presets'] });
      toast.success('Device type created from preset');
      setShowAddDialog(false);
    },
    onError: (error: Error & { message?: string }) => {
      toast.error(error.message || 'Failed to create device type');
    },
  });

  const createCustomMutation = useMutation({
    mutationFn: (data: DeviceTypeFormData) => api.createDeviceType({
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      color: data.color,
      schema: {
        fields: data.fields.filter(f => f.key && f.label).map(f => ({
          key: f.key,
          label: f.label,
          type: f.type,
          unit: f.unit || undefined,
          icon: f.icon || undefined,
          color: f.color || undefined,
          chartType: f.chartType || undefined,
        })),
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-types'] });
      toast.success('Custom device type created');
      setShowAddDialog(false);
      form.reset();
    },
    onError: (error: Error & { message?: string }) => {
      toast.error(error.message || 'Failed to create device type');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDeviceType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-types'] });
      toast.success('Device type deleted');
      setDeleteType(null);
    },
    onError: (error: Error & { message?: string }) => {
      toast.error(error.message || 'Failed to delete device type');
      setDeleteType(null);
    },
  });

  const handleNameChange = (name: string) => {
    form.setValue('name', name);
    // Auto-generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    form.setValue('slug', slug);
  };

  const onSubmitCustom = (data: DeviceTypeFormData) => {
    // Validate at least one field
    const validFields = data.fields.filter(f => f.key && f.label);
    if (validFields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }
    createCustomMutation.mutate(data);
  };

  // Icon component helper - using emoji fallbacks for simplicity
  const getIconEmoji = (iconName: string) => {
    const iconMap: Record<string, string> = {
      thermometer: '🌡️',
      'toggle-left': '🔘',
      waves: '💧',
      egg: '🥚',
      sprout: '🌱',
      cpu: '💻',
      zap: '⚡',
      gauge: '📊',
      activity: '📈',
      droplets: '💧',
      flame: '🔥',
      wind: '💨',
      sun: '☀️',
      moon: '🌙',
      battery: '🔋',
      wifi: '📶',
    };
    return iconMap[iconName] || '📱';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Device Types</h1>
          <p className="text-muted-foreground">
            Manage device type schemas for telemetry visualization
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            form.reset();
            setActiveTab('presets');
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Device Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Device Type</DialogTitle>
              <DialogDescription>
                Choose from available presets or create a custom device type with your own fields
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'presets' | 'custom')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="presets">From Presets</TabsTrigger>
                <TabsTrigger value="custom">Create Custom</TabsTrigger>
              </TabsList>

              {/* Presets Tab */}
              <TabsContent value="presets" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a preset to quickly add a pre-configured device type
                </p>
                {presetsLoading ? (
                  <div className="grid gap-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : presets && presets.length > 0 ? (
                  <div className="grid gap-3">
                    {presets.map((preset) => (
                      <Card
                        key={preset.slug}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => createFromPresetMutation.mutate(preset.slug)}
                      >
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                              style={{ backgroundColor: `${preset.color}20` }}
                            >
                              {getIconEmoji(preset.icon || 'cpu')}
                            </div>
                            <div>
                              <p className="font-medium">{preset.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {preset.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {preset.fieldCount} fields
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={createFromPresetMutation.isPending}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">
                      All presets have been added. Create a custom device type instead.
                    </p>
                    <Button variant="outline" onClick={() => setActiveTab('custom')}>
                      Create Custom Type
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Custom Tab */}
              <TabsContent value="custom" className="space-y-6">
                <form onSubmit={form.handleSubmit(onSubmitCustom)}>
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Basic Information</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Smart Air Quality Monitor"
                          {...form.register('name', { required: true })}
                          onChange={(e) => handleNameChange(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">Slug *</Label>
                        <Input
                          id="slug"
                          placeholder="e.g., air-quality-monitor"
                          {...form.register('slug', { required: true })}
                        />
                        <p className="text-xs text-muted-foreground">
                          URL-friendly identifier (auto-generated from name)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe what this device type monitors..."
                        {...form.register('description')}
                        rows={2}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <Select
                          value={form.watch('icon')}
                          onValueChange={(v) => form.setValue('icon', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ICON_OPTIONS.map((icon) => (
                              <SelectItem key={icon.value} value={icon.value}>
                                {icon.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <Select
                          value={form.watch('color')}
                          onValueChange={(v) => form.setValue('color', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLOR_OPTIONS.map((color) => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: color.value }}
                                  />
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Telemetry Fields</h3>
                        <p className="text-sm text-muted-foreground">
                          Define the data fields this device type will report
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ key: '', label: '', type: 'number', unit: '', chartType: 'line' })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Field
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <Card key={field.id} className="p-4">
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                            <div className="flex-1 space-y-3">
                              <div className="grid gap-3 sm:grid-cols-4">
                                <div className="space-y-1">
                                  <Label className="text-xs">Key *</Label>
                                  <Input
                                    placeholder="e.g., temperature"
                                    {...form.register(`fields.${index}.key`)}
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Label *</Label>
                                  <Input
                                    placeholder="e.g., Temperature"
                                    {...form.register(`fields.${index}.label`)}
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Type</Label>
                                  <Select
                                    value={form.watch(`fields.${index}.type`)}
                                    onValueChange={(v) => form.setValue(`fields.${index}.type`, v as FieldFormData['type'])}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FIELD_TYPE_OPTIONS.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                          {t.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Unit</Label>
                                  <Input
                                    placeholder="e.g., °C, %, kPa"
                                    {...form.register(`fields.${index}.unit`)}
                                    className="h-9"
                                  />
                                </div>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Chart Type</Label>
                                  <Select
                                    value={form.watch(`fields.${index}.chartType`) || 'line'}
                                    onValueChange={(v) => form.setValue(`fields.${index}.chartType`, v as FieldFormData['chartType'])}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CHART_TYPE_OPTIONS.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                          {t.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Color</Label>
                                  <Select
                                    value={form.watch(`fields.${index}.color`) || '_auto'}
                                    onValueChange={(v) => form.setValue(`fields.${index}.color`, v === '_auto' ? '' : v)}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Auto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="_auto">Auto</SelectItem>
                                      {COLOR_OPTIONS.map((color) => (
                                        <SelectItem key={color.value} value={color.value}>
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="w-3 h-3 rounded-full"
                                              style={{ backgroundColor: color.value }}
                                            />
                                            {color.label}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => remove(index)}
                              disabled={fields.length === 1}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {fields.length === 0 && (
                      <Card className="p-8 text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                          No fields defined. Add at least one field.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => append({ key: '', label: '', type: 'number', unit: '', chartType: 'line' })}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add First Field
                        </Button>
                      </Card>
                    )}
                  </div>

                  <DialogFooter className="mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createCustomMutation.isPending}
                    >
                      {createCustomMutation.isPending ? 'Creating...' : 'Create Device Type'}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Device Types Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : deviceTypes && deviceTypes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deviceTypes.map((type) => (
            <Card key={type.id} className="relative group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                      style={{ backgroundColor: `${type.color}20` }}
                    >
                      {getIconEmoji(type.icon)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {type.slug}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteType({ id: type.id, name: type.name })}
                      disabled={type._count.devices > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {type.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {type.description}
                  </p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Fields</span>
                    <Badge variant="outline">
                      {type.schema.fields.length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Devices</span>
                    <Badge variant={type._count.devices > 0 ? 'default' : 'secondary'}>
                      {type._count.devices}
                    </Badge>
                  </div>
                  {type.isSystem ? (
                    <Badge variant="outline" className="w-full justify-center">
                      System Preset
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="w-full justify-center">
                      Custom
                    </Badge>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Fields:</p>
                  <div className="flex flex-wrap gap-1">
                    {type.schema.fields.slice(0, 4).map((field) => (
                      <Badge
                        key={field.key}
                        variant="secondary"
                        className="text-xs"
                        style={{
                          backgroundColor: field.color ? `${field.color}20` : undefined,
                          color: field.color,
                        }}
                      >
                        {field.label}
                        {field.unit && ` (${field.unit})`}
                      </Badge>
                    ))}
                    {type.schema.fields.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{type.schema.fields.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Cpu className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No device types</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add device types to define how telemetry data is displayed
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Device Type
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteType} onOpenChange={() => setDeleteType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteType?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteType && deleteMutation.mutate(deleteType.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
