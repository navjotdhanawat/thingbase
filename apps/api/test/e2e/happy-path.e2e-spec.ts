/**
 * E2E Integration Test: Happy Path Flow
 * 
 * This test covers the complete IoT platform flow:
 * 1. User Registration & Authentication
 * 2. Device Type Management
 * 3. Device Creation & Provisioning
 * 4. Telemetry Simulation via MQTT
 * 5. Telemetry Retrieval & Stats
 * 6. Command Sending & Acknowledgement
 * 7. Alert Rule Creation & Triggering
 * 8. Audit Log Verification
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as mqtt from 'mqtt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MQTT_TOPICS } from '@repo/shared';

describe('IoT Platform E2E Happy Path', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mqttClient: mqtt.MqttClient;

  // Test data storage
  const testData = {
    tenant: {
      id: '',
      name: `Test Tenant ${Date.now()}`,
      slug: `test-tenant-${Date.now()}`,
    },
    user: {
      id: '',
      email: `test-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
      name: 'Test User',
    },
    accessToken: '',
    refreshToken: '',
    deviceType: {
      id: '',
      name: 'Smart Egg Incubator',
      slug: 'egg-incubator-test',
    },
    device: {
      id: '',
      name: 'Farm Incubator #1',
      provisionToken: '',
    },
    command: {
      id: '',
      correlationId: '',
    },
    alertRule: {
      id: '',
    },
  };

  beforeAll(async () => {
    // Create NestJS test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Connect to MQTT broker for device simulation
    mqttClient = mqtt.connect('mqtt://localhost:1883', {
      clientId: `test-device-${Date.now()}`,
      clean: true,
    });

    await new Promise<void>((resolve, reject) => {
      mqttClient.on('connect', () => resolve());
      mqttClient.on('error', reject);
      setTimeout(() => reject(new Error('MQTT connection timeout')), 5000);
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testData.tenant.id) {
      try {
        // Delete in correct order to respect foreign keys
        await prisma.alert.deleteMany({ where: { tenantId: testData.tenant.id } });
        await prisma.alertRule.deleteMany({ where: { tenantId: testData.tenant.id } });
        await prisma.command.deleteMany({ where: { tenantId: testData.tenant.id } });
        await prisma.telemetry.deleteMany({ where: { tenantId: testData.tenant.id } });
        await prisma.deviceCredential.deleteMany({
          where: { device: { tenantId: testData.tenant.id } },
        });
        await prisma.device.deleteMany({ where: { tenantId: testData.tenant.id } });
        await prisma.deviceType.deleteMany({ where: { tenantId: testData.tenant.id } });
        await prisma.auditLog.deleteMany({ where: { tenantId: testData.tenant.id } });
        await prisma.refreshToken.deleteMany({
          where: { user: { tenantId: testData.tenant.id } },
        });
        await prisma.passwordResetToken.deleteMany({
          where: { user: { tenantId: testData.tenant.id } },
        });
        await prisma.user.deleteMany({ where: { tenantId: testData.tenant.id } });
        await prisma.tenant.delete({ where: { id: testData.tenant.id } });
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }

    mqttClient.end();
    await app.close();
  });

  // ============================================================================
  // PHASE 1: AUTHENTICATION
  // ============================================================================

  describe('Phase 1: Authentication', () => {
    it('should register a new user and tenant', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testData.user.email,
          password: testData.user.password,
          name: testData.user.name,
          tenantName: testData.tenant.name,
          tenantSlug: testData.tenant.slug,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      testData.accessToken = response.body.data.accessToken;
      testData.refreshToken = response.body.data.refreshToken;
    });

    it('should get current user info', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/me')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testData.user.email);
      expect(response.body.data.tenantId).toBeDefined();

      testData.user.id = response.body.data.id;
      testData.tenant.id = response.body.data.tenantId;
    });

    it('should login with credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testData.user.email,
          password: testData.user.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();

      testData.accessToken = response.body.data.accessToken;
    });

    it('should refresh the access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: testData.refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();

      testData.accessToken = response.body.data.accessToken;
      testData.refreshToken = response.body.data.refreshToken;
    });
  });

  // ============================================================================
  // PHASE 2: DEVICE TYPE MANAGEMENT
  // ============================================================================

  describe('Phase 2: Device Type Management', () => {
    it('should list available presets', async () => {
      const response = await request(app.getHttpServer())
        .get('/device-types/presets')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify preset structure
      const preset = response.body.data[0];
      expect(preset.slug).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.fieldCount).toBeGreaterThan(0);
    });

    it('should create a custom device type', async () => {
      const response = await request(app.getHttpServer())
        .post('/device-types')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          name: testData.deviceType.name,
          slug: testData.deviceType.slug,
          description: 'Test egg incubator for E2E testing',
          icon: 'egg',
          color: '#fbbf24',
          schema: {
            fields: [
              {
                key: 'temperature',
                label: 'Temperature',
                type: 'number',
                unit: '°C',
                icon: 'thermometer',
                color: '#f97316',
                min: 35,
                max: 42,
                precision: 1,
                chartType: 'line',
              },
              {
                key: 'humidity',
                label: 'Humidity',
                type: 'number',
                unit: '%',
                icon: 'droplets',
                color: '#3b82f6',
                min: 40,
                max: 90,
                precision: 1,
                chartType: 'line',
              },
              {
                key: 'heater_on',
                label: 'Heater',
                type: 'boolean',
                icon: 'flame',
                chartType: 'boolean',
              },
            ],
          },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(testData.deviceType.name);
      expect(response.body.data.schema.fields).toHaveLength(3);

      testData.deviceType.id = response.body.data.id;
    });

    it('should list device types', async () => {
      const response = await request(app.getHttpServer())
        .get('/device-types')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.some((t: any) => t.id === testData.deviceType.id)).toBe(true);
    });
  });

  // ============================================================================
  // PHASE 3: DEVICE MANAGEMENT
  // ============================================================================

  describe('Phase 3: Device Management', () => {
    it('should create a device with type', async () => {
      const response = await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          name: testData.device.name,
          typeId: testData.deviceType.id,
          metadata: { location: 'Farm A', capacity: 50 },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(testData.device.name);
      expect(response.body.data.typeId).toBe(testData.deviceType.id);
      expect(response.body.data.type.name).toBe(testData.deviceType.name);
      expect(response.body.data.status).toBe('pending');

      testData.device.id = response.body.data.id;
    });

    it('should get device by ID with type info', async () => {
      const response = await request(app.getHttpServer())
        .get(`/devices/${testData.device.id}`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testData.device.id);
      expect(response.body.data.type).toBeDefined();
      expect(response.body.data.type.schema.fields).toHaveLength(3);
    });

    it('should generate provision token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/devices/${testData.device.id}/provision`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({ expiresInHours: 24 })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();

      testData.device.provisionToken = response.body.data.token;
    });

    it('should provision device and get MQTT credentials', async () => {
      const response = await request(app.getHttpServer())
        .post(`/devices/${testData.device.id}/activate`)
        .send({ provisionToken: testData.device.provisionToken })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mqttCredentials).toBeDefined();
      expect(response.body.data.mqttCredentials.clientId).toBeDefined();

      // Verify device status changed
      const deviceResponse = await request(app.getHttpServer())
        .get(`/devices/${testData.device.id}`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(deviceResponse.body.data.status).toBe('provisioned');
    });
  });

  // ============================================================================
  // PHASE 4: TELEMETRY SIMULATION
  // ============================================================================

  describe('Phase 4: Telemetry Simulation', () => {
    const telemetryData = {
      temperature: 37.5,
      humidity: 65.2,
      heater_on: true,
    };

    it('should publish telemetry via MQTT', async () => {
      const topic = MQTT_TOPICS.TELEMETRY(testData.tenant.id, testData.device.id);
      const payload = {
        timestamp: new Date().toISOString(),
        data: telemetryData,
      };

      // Publish telemetry
      await new Promise<void>((resolve, reject) => {
        mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should publish multiple telemetry readings', async () => {
      const topic = MQTT_TOPICS.TELEMETRY(testData.tenant.id, testData.device.id);

      // Send 5 more readings with varying values
      for (let i = 0; i < 5; i++) {
        const payload = {
          timestamp: new Date().toISOString(),
          data: {
            temperature: 37 + Math.random() * 2,
            humidity: 60 + Math.random() * 20,
            heater_on: Math.random() > 0.5,
          },
        };

        await new Promise<void>((resolve, reject) => {
          mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should update device status to online', async () => {
      // Publish status
      const statusTopic = MQTT_TOPICS.STATUS(testData.tenant.id, testData.device.id);
      await new Promise<void>((resolve, reject) => {
        mqttClient.publish(
          statusTopic,
          JSON.stringify({ status: 'online', timestamp: new Date().toISOString() }),
          { qos: 1, retain: true },
          (err) => (err ? reject(err) : resolve()),
        );
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify device status
      const response = await request(app.getHttpServer())
        .get(`/devices/${testData.device.id}`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('online');
      expect(response.body.data.lastSeen).toBeDefined();
    });

    it('should retrieve telemetry data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/telemetry/${testData.device.id}`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.items.length).toBeGreaterThanOrEqual(6);
    });

    it('should get telemetry stats with all fields', async () => {
      const response = await request(app.getHttpServer())
        .get(`/telemetry/${testData.device.id}/stats`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBeGreaterThanOrEqual(6);
      expect(response.body.data.fields).toBeDefined();
      expect(response.body.data.fields.temperature).toBeDefined();
      expect(response.body.data.fields.humidity).toBeDefined();
      expect(response.body.data.fields.temperature.avg).toBeGreaterThan(35);
      expect(response.body.data.fields.temperature.avg).toBeLessThan(42);
    });

    it('should get telemetry schema', async () => {
      const response = await request(app.getHttpServer())
        .get(`/telemetry/${testData.device.id}/schema`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.schema).toBeDefined();
      expect(response.body.data.schema.fields).toHaveLength(3);
      expect(response.body.data.schema.fields.map((f: any) => f.key)).toContain('temperature');
    });

    it('should get latest telemetry', async () => {
      const response = await request(app.getHttpServer())
        .get(`/telemetry/${testData.device.id}/latest`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.data).toBeDefined();
    });
  });

  // ============================================================================
  // PHASE 5: COMMANDS
  // ============================================================================

  describe('Phase 5: Command & Control', () => {
    it('should send a command to device', async () => {
      const response = await request(app.getHttpServer())
        .post('/commands')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          deviceId: testData.device.id,
          type: 'setTemperature',
          payload: { targetTemp: 38.0 },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.correlationId).toBeDefined();
      expect(response.body.data.status).toBe('pending');

      testData.command.id = response.body.data.id;
      testData.command.correlationId = response.body.data.correlationId;
    });

    it('should list commands', async () => {
      const response = await request(app.getHttpServer())
        .get(`/commands?deviceId=${testData.device.id}`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should simulate command acknowledgement via MQTT', async () => {
      // Wait for command to be sent
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Publish acknowledgement
      const ackTopic = MQTT_TOPICS.ACK(testData.tenant.id, testData.device.id);
      const ackPayload = {
        correlationId: testData.command.correlationId,
        status: 'success',
        timestamp: new Date().toISOString(),
      };

      await new Promise<void>((resolve, reject) => {
        mqttClient.publish(ackTopic, JSON.stringify(ackPayload), { qos: 1 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should verify command was acknowledged', async () => {
      const response = await request(app.getHttpServer())
        .get(`/commands/${testData.command.id}`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(['acked', 'completed']).toContain(response.body.data.status);
      expect(response.body.data.completedAt).toBeDefined();
    });
  });

  // ============================================================================
  // PHASE 6: ALERTS
  // ============================================================================

  describe('Phase 6: Alert Management', () => {
    it('should create an alert rule', async () => {
      const response = await request(app.getHttpServer())
        .post('/alerts/rules')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          name: 'High Temperature Alert',
          type: 'threshold',
          deviceId: testData.device.id,
          condition: {
            metric: 'temperature',
            operator: '>',
            value: 39.0,
          },
          enabled: true,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe('High Temperature Alert');

      testData.alertRule.id = response.body.data.id;
    });

    it('should list alert rules', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts/rules')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should trigger alert with high temperature telemetry', async () => {
      // Send telemetry that exceeds threshold
      const topic = MQTT_TOPICS.TELEMETRY(testData.tenant.id, testData.device.id);
      const payload = {
        timestamp: new Date().toISOString(),
        data: {
          temperature: 40.5, // Exceeds 39.0 threshold
          humidity: 65.0,
          heater_on: true,
        },
      };

      await new Promise<void>((resolve, reject) => {
        mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Wait for alert processing
      await new Promise((resolve) => setTimeout(resolve, 1500));
    });

    it('should have triggered an alert', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts?status=active')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThanOrEqual(1);

      const alert = response.body.data.items.find(
        (a: any) => a.ruleId === testData.alertRule.id,
      );
      expect(alert).toBeDefined();
      expect(alert.status).toBe('active');
    });

    it('should acknowledge alert', async () => {
      // Get alert ID
      const alertsResponse = await request(app.getHttpServer())
        .get(`/alerts?status=active&deviceId=${testData.device.id}`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      const alertId = alertsResponse.body.data.items[0]?.id;
      if (!alertId) {
        console.log('No alert found to acknowledge, skipping...');
        return;
      }

      const response = await request(app.getHttpServer())
        .post(`/alerts/${alertId}/acknowledge`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('acknowledged');
    });
  });

  // ============================================================================
  // PHASE 7: AUDIT LOGS
  // ============================================================================

  describe('Phase 7: Audit Logs', () => {
    it('should have audit logs for actions performed', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    it('should filter audit logs by resource type', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit?resourceType=device')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should have logs related to device operations
    });

    it('should get available audit actions', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit/actions')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ============================================================================
  // PHASE 8: TENANT & USER MANAGEMENT
  // ============================================================================

  describe('Phase 8: Tenant & User Management', () => {
    it('should get tenant info', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenant')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testData.tenant.id);
      expect(response.body.data.name).toBe(testData.tenant.name);
    });

    it('should get tenant stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenant/stats')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userCount).toBeGreaterThanOrEqual(1);
      expect(response.body.data.deviceCount).toBeGreaterThanOrEqual(1);
    });

    it('should list users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should update user profile', async () => {
      const response = await request(app.getHttpServer())
        .patch('/auth/profile')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({ name: 'Updated Test User' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Test User');
    });

    it('should change password', async () => {
      const newPassword = 'NewSecurePassword456!';

      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          currentPassword: testData.user.password,
          newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify can login with new password
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testData.user.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      testData.accessToken = loginResponse.body.data.accessToken;
      testData.user.password = newPassword;
    });
  });

  // ============================================================================
  // PHASE 9: CLEANUP & LOGOUT
  // ============================================================================

  describe('Phase 9: Cleanup', () => {
    it('should delete alert rule', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/alerts/rules/${testData.alertRule.id}`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should delete device', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/devices/${testData.device.id}`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should delete device type', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/device-types/${testData.deviceType.id}`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should logout', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject requests after logout', async () => {
      await request(app.getHttpServer())
        .get('/devices')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(401);
    });
  });
});


