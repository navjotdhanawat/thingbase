# Real-Time Implementation Plan ✅ COMPLETED

## 📊 Current Architecture Analysis

### What's Already In Place ✅

1. **MQTT → API → Redis Pub/Sub Pipeline**
   - `mqtt.handlers.ts` receives telemetry and publishes to `REDIS_KEYS.DEVICE_UPDATES_CHANNEL(tenantId)`
   - Events: `device:telemetry`, `command:ack`, `device:status`

2. **Socket.IO Gateway (DeviceGateway)**
   - JWT authentication on connection
   - Tenant-based rooms: `tenant:{tenantId}`
   - Device-specific rooms: `device:{deviceId}`
   - Subscribes to Redis channels and broadcasts to rooms

3. **Web Socket Client**
   - `socket.ts` - connects with auth token
   - Auto-connects on login, disconnects on logout

### What's Missing ❌

1. **Web UI doesn't listen to Socket events**
2. **Mobile app doesn't have Socket.IO integration**
3. **WebSocket Gateway uses wrong Redis channel pattern** (uses `channel:devices:*` but publishes to `REDIS_KEYS.DEVICE_UPDATES_CHANNEL`)
4. **No command sending via Socket.IO**

---

## 🎯 Implementation Plan

### Phase 1: Fix Backend WebSocket Gateway

**File:** `apps/api/src/modules/websocket/device.gateway.ts`

**Changes:**
1. Fix Redis pattern subscription to match actual channel names
2. Add `send:command` message handler for bidirectional commands
3. Emit proper event types for frontend consumption

### Phase 2: Web Real-Time Integration

**Files to modify:**
- `apps/web/src/lib/socket.ts` - Add typed event handlers
- `apps/web/src/hooks/use-device-updates.ts` - Hook for real-time device updates
- `apps/web/src/app/(dashboard)/devices/[id]/page.tsx` - Integrate real-time

**New hook structure:**
```typescript
useDeviceRealtime(deviceId) {
  // Subscribe to device:${deviceId} room
  // Listen for device:telemetry, device:state events
  // Return { state, lastUpdate, isConnected }
}
```

### Phase 3: Mobile Real-Time Integration

**Files to create/modify:**
- `apps/mobile/lib/core/network/socket_service.dart` - Socket.IO client service
- `apps/mobile/lib/features/devices/providers/socket_provider.dart` - Riverpod provider
- `apps/mobile/lib/features/devices/presentation/screens/device_detail_screen.dart` - Integrate

**Architecture:**
```dart
class SocketService {
  late IO.Socket socket;
  
  void connect(String token);
  void subscribeToDevice(String deviceId);
  Stream<DeviceState> get deviceUpdates;
  Future<bool> sendCommand(String deviceId, String action, Map params);
}
```

---

## 📁 Files to Modify

### Backend (API)

| File | Action | Description |
|------|--------|-------------|
| `modules/websocket/device.gateway.ts` | MODIFY | Fix Redis subscription, add command handler |
| `redis/redis.service.ts` | OK | No changes needed |
| `modules/mqtt/mqtt.handlers.ts` | OK | Already publishes to Redis |

### Web Frontend

| File | Action | Description |
|------|--------|-------------|
| `lib/socket.ts` | MODIFY | Add event types, export subscribe helpers |
| `hooks/use-device-updates.ts` | MODIFY | Implement real-time hook |
| `app/(dashboard)/devices/[id]/page.tsx` | MODIFY | Use real-time hook |
| `app/(dashboard)/devices/page.tsx` | MODIFY | Show real-time status badges |

### Mobile App

| File | Action | Description |
|------|--------|-------------|
| `core/network/socket_service.dart` | CREATE | Socket.IO service |
| `features/devices/providers/device_realtime_provider.dart` | CREATE | Real-time state provider |
| `features/devices/presentation/screens/device_detail_screen.dart` | MODIFY | Subscribe to updates |
| `core/config/app_config.dart` | OK | Already has wsBaseUrl |

---

## 🔄 Event Flow (After Implementation)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          REAL-TIME EVENT FLOW                                 │
└──────────────────────────────────────────────────────────────────────────────┘

1. TELEMETRY FLOW (Device → Client)
   IoT Device → MQTT → mqtt.handlers.ts → Redis Pub/Sub → device.gateway.ts → Socket.IO → Client

2. COMMAND FLOW (Client → Device)
   Client → Socket.IO → device.gateway.ts → commands.service.ts → MQTT → IoT Device
                                                                          ↓
   Client ← Socket.IO ← device.gateway.ts ← Redis Pub/Sub ← mqtt.handlers.ts ← ACK

```

---

## 🔒 Multi-Tenancy Considerations

1. **JWT validation on WebSocket connect** - Already in place ✅
2. **Room-based isolation** - `tenant:{tenantId}` rooms ✅
3. **Device ownership verification** - Checked before joining device room ✅
4. **Command authorization** - Must verify device belongs to user's tenant

---

## ⚡ Performance Optimizations

1. **No polling** - Pure event-driven
2. **Room-based broadcasting** - Only affected clients receive updates
3. **Redis Pub/Sub** - Scales horizontally with multiple API instances
4. **Debounce rapid updates** - Throttle UI updates if too fast (> 5/sec)

---

## 🚨 Error Handling Strategy

Per user's requirement: **No buffering, show errors immediately**

```typescript
// Mobile/Web
socket.emit('send:command', { deviceId, action, params }, (response) => {
  if (response.error) {
    showError(response.error); // Show immediately
  } else if (response.timeout) {
    showError('Device is not responding'); // Timeout after 10s
  }
});
```

---

## 📋 Implementation Order

1. **Fix DeviceGateway Redis subscription** (Backend)
2. **Add command sending to DeviceGateway** (Backend)  
3. **Update web hooks for real-time** (Web)
4. **Integrate real-time in device detail page** (Web)
5. **Create SocketService for mobile** (Mobile)
6. **Integrate real-time in mobile device detail** (Mobile)
7. **Test end-to-end with simulator** (Testing)

---

Ready to proceed? I'll start with Phase 1.
