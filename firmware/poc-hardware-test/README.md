# ESP32 Hardware Test POC - Warehouse Monitoring Device

This is a standalone PlatformIO project to test all hardware components before integrating with the main ThingBase firmware.

## Features Tested

| Component     | GPIO Pin | Description                 |
| ------------- | -------- | --------------------------- |
| DHT22 Sensor  | GPIO 4   | Temperature & Humidity      |
| Red Alert LED | GPIO 5   | Alert indicator + heartbeat |
| Buzzer        | GPIO 18  | Audio alerts                |
| Status LED    | GPIO 2   | Built-in LED (heartbeat)    |
| Reset Button  | GPIO 0   | BOOT button for testing     |

## Wiring Diagram

```
                          ESP32
                      ┌──────────────┐
                      │              │
    DHT22 DATA ──────►│ GPIO 4       │
                      │              │
    Red LED (+) ─────►│ GPIO 5       │──── 220Ω ──── LED+
                      │              │              LED- ── GND
                      │              │
    Buzzer (+) ──────►│ GPIO 18      │──── Buzzer+
                      │              │     Buzzer- ── GND
                      │              │
    (Built-in) ──────►│ GPIO 0       │  BOOT button
                      │              │
    (Built-in) ──────►│ GPIO 2       │  Status LED (blue)
                      │              │
                      │   3.3V  ─────┼──── DHT22 VCC
                      │   GND   ─────┼──── All component GNDs
                      └──────────────┘

Note: Add 4.7kΩ pull-up resistor between DHT22 DATA and 3.3V
```

## Quick Start

### 1. Build and Upload

```bash
cd firmware/poc-hardware-test
pio run --target upload
```

### 2. Monitor Serial Output

```bash
pio device monitor
```

Or in one command:

```bash
pio run --target upload && pio device monitor
```

## Expected Serial Output

```
============================================================
  ESP32 HARDWARE TEST - Warehouse Monitor POC
  Version: 1.0.0 | No Cloud Mode
============================================================

[INIT] Configuring GPIO pins...
  ✓ GPIO 2 configured as OUTPUT (Status LED)
  ✓ GPIO 5 configured as OUTPUT (Red Alert LED)
  ✓ GPIO 18 configured as OUTPUT (Buzzer)
  ✓ GPIO 0 configured as INPUT_PULLUP (Reset Button)
  ✓ GPIO 4 configured for DHT22 sensor

[TEST 1/5] Status LED (GPIO 2 - Built-in Blue)
  Testing Status LED on GPIO 2...
    [1/3] ON  → OFF
    [2/3] ON  → OFF
    [3/3] ON  → OFF
  ✓ Status LED test complete

... (more tests) ...

[SENSOR] Temp: 24.5°C | Humidity: 55.2%
[HEARTBEAT] ♥
```

## Interactive Controls

| Action                            | Result                         |
| --------------------------------- | ------------------------------ |
| **Short press** BOOT button (<3s) | Quick LED + Buzzer test        |
| **Long press** BOOT button (≥3s)  | Run full hardware test         |
| Temperature/Humidity out of range | Red LED flashes + Buzzer beeps |

## Configuration

Edit these values in `src/main.cpp`:

```cpp
// PIN DEFINITIONS
#define DHT_PIN           4   // Change if using different GPIO
#define RED_LED_PIN       5
#define BUZZER_PIN        18

// SENSOR TYPE (DHT22 or DHT11)
#define DHT_TYPE DHT22

// THRESHOLDS
const float TEMP_HIGH_THRESHOLD = 30.0;     // °C
const float TEMP_LOW_THRESHOLD = 10.0;      // °C
const float HUMIDITY_HIGH_THRESHOLD = 70.0; // %
const float HUMIDITY_LOW_THRESHOLD = 30.0;  // %
```

## Troubleshooting

### DHT Sensor Not Reading

1. **Check wiring**: DATA → GPIO 4, VCC → 3.3V, GND → GND
2. **Add pull-up resistor**: 4.7kΩ between DATA and VCC
3. **Wrong sensor type?**: Change `DHT_TYPE` from `DHT22` to `DHT11`
4. **Defective sensor**: Try a different DHT22 module

### LED Not Blinking

1. Check polarity: Long leg (+) to GPIO, short leg (-) to GND
2. Verify 220Ω resistor is connected
3. Confirm GPIO pin is correct

### Buzzer Not Working

1. Check polarity: (+) marked pin to GPIO, (-) to GND
2. Active buzzer? Should beep with just voltage
3. Passive buzzer? Needs PWM signal (uncomment tone code in main.cpp)

## Files

```
poc-hardware-test/
├── platformio.ini      # Build configuration
├── README.md           # This file
└── src/
    └── main.cpp        # Main test code
```

## Next Steps

After successful hardware testing:

1. Integrate sensor code into main `firmware/esp32`
2. Add WiFi/MQTT connectivity
3. Configure alert thresholds via dashboard
4. Design PCB for production
