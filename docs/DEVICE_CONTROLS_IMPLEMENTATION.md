# 🎮 Device Controls Implementation Plan

## Overview

This document outlines the implementation of bi-directional device control for ThingBase, enabling the platform to not only display sensor data but also control IoT devices through the mobile and web apps.

## Scope

### In Scope
- Schema enhancement with `mode` and `widget` fields
- 5 device type presets covering all widget types
- Dynamic widget rendering in mobile app
- Dynamic widget rendering in web app
- Command sending for control widgets

### Out of Scope (Future)
- Custom device type creation from UI
- Categories in preset picker
- Scheduling/automation
- Widget customization per user

---

## 📦 Device Type Presets (5 Types)

| # | Device Type | Read | ReadWrite | Write | Primary Widgets |
|---|-------------|------|-----------|-------|-----------------|
| 1 | Temperature & Humidity Monitor | ✅ | - | - | Gauge, Value |
| 2 | Smart Relay (4-Channel) | ✅ | ✅ | - | Switch, Value |
| 3 | Smart Thermostat | ✅ | ✅ | - | Gauge, Switch, Slider, Dropdown |
| 4 | LED Strip Controller | - | ✅ | - | Switch, Slider, Dropdown |
| 5 | Smart Doorbell | ✅ | - | ✅ | Value, Button |

---

## 🔧 Implementation Tasks

### Phase 1: Shared Schema Enhancement

#### Task 1.1: Update `deviceFieldSchema`
**File:** `packages/shared/src/schemas/device-type.ts`

Add two new fields:
```typescript
mode: z.enum(['read', 'write', 'readwrite']).default('read'),
widget: z.enum(['value', 'gauge', 'switch', 'slider', 'dropdown', 'button']).optional(),
step: z.number().optional(), // For sliders
```

#### Task 1.2: Update Device Type Presets
**File:** `packages/shared/src/schemas/device-type.ts`

Replace/update `DEVICE_TYPE_PRESETS` with 5 new presets that include `mode` and `widget` fields.

---

### Phase 2: Mobile App Widgets

#### Task 2.1: Create Widget Components
**Directory:** `apps/mobile/lib/features/devices/presentation/widgets/`

Create widget components:
- `value_widget.dart` - Simple text display
- `gauge_widget.dart` - Circular gauge
- `switch_widget.dart` - Toggle switch
- `slider_widget.dart` - Range slider
- `dropdown_widget.dart` - Dropdown select
- `button_widget.dart` - Action button

#### Task 2.2: Create Widget Factory
**File:** `apps/mobile/lib/features/devices/presentation/widgets/widget_factory.dart`

A factory function that renders the correct widget based on field definition.

#### Task 2.3: Update Device Detail Screen
**File:** `apps/mobile/lib/features/devices/presentation/screens/device_detail_screen.dart`

- Fetch device type schema
- Separate fields into sensors (read) and controls (write/readwrite)
- Use widget factory to render fields
- Implement control change handler that sends commands

#### Task 2.4: Add Command Sending
**File:** `apps/mobile/lib/features/devices/data/devices_repository.dart`

Add method to send commands to devices.

---

### Phase 3: Web App Widgets

#### Task 3.1: Create Widget Components
**Directory:** `apps/web/src/components/devices/widgets/`

Create widget components:
- `value-widget.tsx`
- `gauge-widget.tsx`
- `switch-widget.tsx`
- `slider-widget.tsx`
- `dropdown-widget.tsx`
- `button-widget.tsx`

#### Task 3.2: Create Widget Factory
**File:** `apps/web/src/components/devices/widgets/widget-factory.tsx`

#### Task 3.3: Update Device Detail Page
**File:** `apps/web/src/app/(dashboard)/devices/[id]/page.tsx`

- Use widget factory for dynamic rendering
- Implement control handlers

---

### Phase 4: API Enhancements (Minimal)

#### Task 4.1: Add Device Schema Endpoint
**File:** `apps/api/src/modules/devices/devices.controller.ts`

Add endpoint to get device's type schema:
```
GET /devices/:id/schema
```

This already exists via `device.type.schema` but we may want a dedicated endpoint.

---

## 📐 Data Flow

### Reading Sensor Data (Existing)
```
Device → MQTT → API → Redis → WebSocket → Mobile/Web
```

### Sending Control Commands (New Flow)
```
Mobile/Web → POST /commands → API → MQTT → Device
                                    ↓
                              Device ACKs
                                    ↓
                              State Update via MQTT
                                    ↓
                              WebSocket → Mobile/Web
```

---

## 🎨 Widget Specifications

### Value Widget
- **Purpose:** Display read-only text/numbers
- **Inputs:** `value`, `label`, `unit`, `icon`
- **Output:** None (read-only)

### Gauge Widget
- **Purpose:** Visual circular meter
- **Inputs:** `value`, `min`, `max`, `label`, `unit`, `color`
- **Output:** None (read-only)

### Switch Widget
- **Purpose:** Boolean toggle
- **Inputs:** `value` (boolean), `label`, `icon`
- **Output:** Sends command with `{ [key]: boolean }`

### Slider Widget
- **Purpose:** Numeric range control
- **Inputs:** `value`, `min`, `max`, `step`, `label`, `unit`
- **Output:** Sends command with `{ [key]: number }`
- **Debounce:** 300ms to avoid spamming

### Dropdown Widget
- **Purpose:** Enum selection
- **Inputs:** `value`, `values[]`, `label`
- **Output:** Sends command with `{ [key]: string }`

### Button Widget
- **Purpose:** One-shot action
- **Inputs:** `label`, `icon`, `color`
- **Output:** Sends command with `{ [key]: true }`

---

## 📋 File Changes Summary

### Shared Package
| File | Action |
|------|--------|
| `packages/shared/src/schemas/device-type.ts` | Modify |

### Mobile App
| File | Action |
|------|--------|
| `apps/mobile/lib/features/devices/presentation/widgets/value_widget.dart` | Create |
| `apps/mobile/lib/features/devices/presentation/widgets/gauge_widget.dart` | Create |
| `apps/mobile/lib/features/devices/presentation/widgets/switch_widget.dart` | Create |
| `apps/mobile/lib/features/devices/presentation/widgets/slider_widget.dart` | Create |
| `apps/mobile/lib/features/devices/presentation/widgets/dropdown_widget.dart` | Create |
| `apps/mobile/lib/features/devices/presentation/widgets/button_widget.dart` | Create |
| `apps/mobile/lib/features/devices/presentation/widgets/widget_factory.dart` | Create |
| `apps/mobile/lib/features/devices/presentation/screens/device_detail_screen.dart` | Modify |
| `apps/mobile/lib/features/devices/data/devices_repository.dart` | Modify |

### Web App
| File | Action |
|------|--------|
| `apps/web/src/components/devices/widgets/value-widget.tsx` | Create |
| `apps/web/src/components/devices/widgets/gauge-widget.tsx` | Create |
| `apps/web/src/components/devices/widgets/switch-widget.tsx` | Create |
| `apps/web/src/components/devices/widgets/slider-widget.tsx` | Create |
| `apps/web/src/components/devices/widgets/dropdown-widget.tsx` | Create |
| `apps/web/src/components/devices/widgets/button-widget.tsx` | Create |
| `apps/web/src/components/devices/widgets/widget-factory.tsx` | Create |
| `apps/web/src/components/devices/widgets/index.ts` | Create |
| Device detail page | Modify |

---

## ✅ Implementation Status

### Completed ✅

1. **Schema Enhancement** (shared package)
   - Added `mode` field: `'read' | 'write' | 'readwrite'` 
   - Added `widget` field: `'value' | 'gauge' | 'switch' | 'slider' | 'dropdown' | 'button'`
   - Added `step` field for sliders
   - Added `inferWidgetType()` helper function
   - Created 6 new device presets:
     - `temp-humidity` - Temperature & Humidity Monitor (read-only)
     - `relay-4ch` - Smart Relay 4 Channel (readwrite switches)
     - `thermostat` - Smart Thermostat (mixed sensors + controls)
     - `led-strip` - LED Strip Controller (readwrite controls)
     - `doorbell` - Smart Doorbell (read status + write actions)
     - `generic-sensor` - Generic Sensor (legacy, read-only)

2. **Mobile App Widgets**
   - `value_widget.dart` - Simple text/number display
   - `gauge_widget.dart` - Circular gauge with arc
   - `switch_widget.dart` - Toggle switch with optimistic updates
   - `slider_widget.dart` - Range slider with debouncing
   - `dropdown_widget.dart` - Dropdown select for enums
   - `button_widget.dart` - Action button with loading state
   - `widget_factory.dart` - Dynamic widget factory with icon mapping
   - Updated `device_detail_screen.dart` - Uses widget factory, separates sensors/controls
   - Updated `devices_provider.dart` - Added command sending capability

3. **Web App Widgets**
   - `value-widget.tsx` - Simple text/number display
   - `gauge-widget.tsx` - SVG circular gauge
   - `switch-widget.tsx` - Toggle switch with optimistic updates
   - `slider-widget.tsx` - Range slider with debouncing
   - `dropdown-widget.tsx` - Dropdown select for enums
   - `button-widget.tsx` - Action button with loading state
   - `widget-factory.tsx` - Dynamic widget factory with Lucide icons
   - `device-control-panel.tsx` - Reusable control panel component
   - Added `slider.tsx` UI component (Radix UI based)
   - Updated device detail page to use DeviceControlPanel

4. **Simulator Updates**
   - Added `set_state` command handling
   - Added telemetry generators for new device types
   - Dynamic state updates for all field keys

---

## ✅ Testing Checklist

- [x] Schema validation works with new fields
- [x] Existing presets still work (backward compatible)
- [x] New presets available in DEVICE_TYPE_PRESETS
- [ ] Mobile: All 6 widgets render correctly
- [ ] Mobile: Switch widget sends commands
- [ ] Mobile: Slider widget sends commands (debounced)
- [ ] Mobile: Dropdown widget sends commands
- [ ] Mobile: Button widget sends commands
- [ ] Mobile: Real-time state updates reflect in controls
- [ ] Web: All 6 widgets render correctly
- [ ] Web: Controls send commands
- [ ] Web: Real-time state updates reflect in controls
- [ ] Command acknowledgment works
- [ ] Command timeout/failure handling

---

## 🚀 Next Steps

1. **Test with Simulator**: Run the device simulator with new device types
2. **Create Devices**: Create devices in the web dashboard using new presets
3. **Verify Controls**: Test control widgets sending commands
4. **Mobile Testing**: Run mobile app and test widget rendering

### Testing Commands

```bash
# Build shared package
pnpm --filter @thingbase/shared build

# Run API
pnpm --filter @repo/api dev

# Run Web
pnpm --filter @repo/web dev

# Run Simulator with new device types
pnpm --filter @repo/simulator build
pnpm --filter @repo/simulator start --tenant-id <id> --device-id <id> --type relay-4ch
```

---

*Last Updated: 2024-12-22*

