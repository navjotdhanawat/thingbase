const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

interface ResponseMeta {
  requestId: string;
  timestamp: string;
}

interface ApiResponseWrapper<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: ResponseMeta;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  private onTokenRefreshed: ((tokens: { accessToken: string; refreshToken: string }) => void) | null = null;
  private onSessionExpired: (() => void) | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
  }

  // Register callbacks for token events
  onAuthEvents(callbacks: {
    onTokenRefreshed?: (tokens: { accessToken: string; refreshToken: string }) => void;
    onSessionExpired?: () => void;
  }) {
    this.onTokenRefreshed = callbacks.onTokenRefreshed || null;
    this.onSessionExpired = callbacks.onSessionExpired || null;
  }

  private subscribeToTokenRefresh(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  private onRefreshSuccess(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private async attemptTokenRefresh(): Promise<string | null> {
    if (!this.refreshToken) {
      return null;
    }

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const response = await res.json();

      if (res.ok && response.success) {
        const { accessToken, refreshToken } = response.data;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;

        // Notify auth store of new tokens
        if (this.onTokenRefreshed) {
          this.onTokenRefreshed({ accessToken, refreshToken });
        }

        return accessToken;
      }
    } catch (error) {
      console.error('[API] Token refresh failed:', error);
    }

    return null;
  }

  private async fetch<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] =
        `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - attempt token refresh
    if (res.status === 401 && !isRetry && !path.includes('/auth/')) {
      if (this.isRefreshing) {
        // Wait for the ongoing refresh to complete
        return new Promise((resolve, reject) => {
          this.subscribeToTokenRefresh(async (newToken) => {
            try {
              const result = await this.fetch<T>(path, options, true);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });
        });
      }

      this.isRefreshing = true;

      try {
        const newToken = await this.attemptTokenRefresh();

        if (newToken) {
          this.isRefreshing = false;
          this.onRefreshSuccess(newToken);
          // Retry the original request with new token
          return this.fetch<T>(path, options, true);
        } else {
          // Refresh failed - session expired
          this.isRefreshing = false;
          if (this.onSessionExpired) {
            this.onSessionExpired();
          }
        }
      } catch {
        this.isRefreshing = false;
        if (this.onSessionExpired) {
          this.onSessionExpired();
        }
      }
    }

    const response: ApiResponseWrapper<T> = await res.json();

    if (!res.ok || !response.success) {
      const error: ApiError = {
        message: response.error?.message || 'An error occurred',
        code: response.error?.code,
        details: response.error?.details,
        requestId: response.meta?.requestId,
      };

      // Log error with request ID for debugging
      console.error(
        `[API Error] ${error.code || 'UNKNOWN'}: ${error.message}`,
        error.requestId ? `(requestId: ${error.requestId})` : ''
      );

      throw error;
    }

    // Return data directly, or fall back to entire response for backward compatibility
    return (response.data ?? response) as T;
  }


  // Auth
  async register(data: {
    email: string;
    password: string;
    name?: string;
    tenantName: string;
    tenantSlug: string;
  }) {
    return this.fetch<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  }

  async login(data: { email: string; password: string }) {
    return this.fetch<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>('/auth/login', { method: 'POST', body: JSON.stringify(data) });
  }

  async refreshTokenRequest(refreshToken: string) {
    return this.fetch<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout() {
    return this.fetch<{ message: string }>('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.fetch<{
      id: string;
      email: string;
      role: string;
      tenantId: string;
      name?: string;
    }>('/auth/me', {
      method: 'POST',
    });
  }

  async forgotPassword(email: string) {
    return this.fetch<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.fetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.fetch<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async updateProfile(data: { name?: string }) {
    return this.fetch<{
      id: string;
      email: string;
      name: string | null;
      role: string;
    }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Tenant
  async getTenant() {
    return this.fetch<{
      id: string;
      name: string;
      slug: string;
      plan: string;
      createdAt: string;
      updatedAt: string;
    }>('/tenant');
  }

  async getTenantStats() {
    return this.fetch<{ userCount: number; deviceCount: number }>(
      '/tenant/stats'
    );
  }

  // Users
  async getUsers(params?: { page?: number; pageSize?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    const queryString = query.toString();
    return this.fetch<
      PaginatedResponse<{
        id: string;
        email: string;
        name?: string;
        role: string;
        status: string;
        createdAt: string;
      }>
    >(`/users${queryString ? `?${queryString}` : ''}`);
  }

  async inviteUser(data: { email: string; role?: string }) {
    return this.fetch<{
      id: string;
      email: string;
      role: string;
      status: string;
    }>('/users/invite', { method: 'POST', body: JSON.stringify(data) });
  }

  // Devices
  async getDevices(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const queryString = query.toString();
    const result = await this.fetch<
      PaginatedResponse<{
        id: string;
        name: string;
        externalId?: string;
        status: string;
        lastSeen?: string;
        metadata: Record<string, unknown>;
        createdAt: string;
      }>
    >(`/devices${queryString ? `?${queryString}` : ''}`);
    return result.items;
  }

  async getDevicesPaginated(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const queryString = query.toString();
    return this.fetch<
      PaginatedResponse<{
        id: string;
        name: string;
        externalId?: string;
        status: string;
        lastSeen?: string;
        metadata: Record<string, unknown>;
        createdAt: string;
      }>
    >(`/devices${queryString ? `?${queryString}` : ''}`);
  }

  async getDevice(id: string) {
    return this.fetch<{
      id: string;
      name: string;
      typeId?: string;
      type?: {
        id: string;
        name: string;
        slug: string;
        icon: string;
        color: string;
        schema: {
          fields: Array<{
            key: string;
            label: string;
            type: string;
            unit?: string;
            icon?: string;
            color?: string;
          }>;
        };
      };
      externalId?: string;
      status: string;
      lastSeen?: string;
      metadata: Record<string, unknown>;
      createdAt: string;
    }>(`/devices/${id}`);
  }

  async createDevice(data: {
    name: string;
    typeId?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.fetch<{
      id: string;
      name: string;
      typeId?: string;
      externalId?: string;
      status: string;
      createdAt: string;
    }>('/devices', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateDevice(
    id: string,
    data: {
      name?: string;
      typeId?: string;
      externalId?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.fetch<{
      id: string;
      name: string;
      typeId?: string;
      externalId?: string;
      status: string;
    }>(`/devices/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteDevice(id: string) {
    return this.fetch<{ message: string }>(`/devices/${id}`, {
      method: 'DELETE',
    });
  }

  async generateProvisionToken(deviceId: string, expiresInHours?: number) {
    return this.fetch<{ token: string; expiresAt: string }>(
      `/devices/${deviceId}/provision`,
      {
        method: 'POST',
        body: JSON.stringify({ expiresInHours }),
      }
    );
  }

  async getDeviceState(deviceId: string) {
    return this.fetch<Record<string, unknown> | null>(
      `/devices/${deviceId}/state`
    );
  }

  // Commands
  async getCommands(deviceId?: string, params?: { page?: number; pageSize?: number }) {
    const query = new URLSearchParams();
    if (deviceId) query.set('deviceId', deviceId);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    const queryString = query.toString();
    const result = await this.fetch<
      PaginatedResponse<{
        id: string;
        deviceId: string;
        correlationId: string;
        type: string;
        payload: Record<string, unknown>;
        status: string;
        errorMessage?: string;
        createdAt: string;
        sentAt?: string;
        completedAt?: string;
      }>
    >(`/commands${queryString ? `?${queryString}` : ''}`);
    return result.items;
  }

  async getCommandsPaginated(params?: {
    deviceId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.deviceId) query.set('deviceId', params.deviceId);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    const queryString = query.toString();
    return this.fetch<
      PaginatedResponse<{
        id: string;
        deviceId: string;
        correlationId: string;
        type: string;
        payload: Record<string, unknown>;
        status: string;
        errorMessage?: string;
        createdAt: string;
        sentAt?: string;
        completedAt?: string;
      }>
    >(`/commands${queryString ? `?${queryString}` : ''}`);
  }

  async getCommand(id: string) {
    return this.fetch<{
      id: string;
      deviceId: string;
      correlationId: string;
      type: string;
      payload: Record<string, unknown>;
      status: string;
      errorMessage?: string;
      createdAt: string;
      sentAt?: string;
      completedAt?: string;
    }>(`/commands/${id}`);
  }

  async sendCommand(data: {
    deviceId: string;
    type: string;
    payload: Record<string, unknown>;
  }) {
    return this.fetch<{
      id: string;
      correlationId: string;
      status: string;
    }>('/commands', { method: 'POST', body: JSON.stringify(data) });
  }

  async retryCommand(commandId: string) {
    return this.fetch<{
      id: string;
      correlationId: string;
      status: string;
    }>(`/commands/${commandId}/retry`, { method: 'POST' });
  }

  // Telemetry
  async getTelemetry(deviceId: string, params?: {
    startTime?: string;
    endTime?: string;
    interval?: '1m' | '5m' | '1h' | '1d';
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.startTime) query.set('startTime', params.startTime);
    if (params?.endTime) query.set('endTime', params.endTime);
    if (params?.interval) query.set('interval', params.interval);
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString();
    return this.fetch<{
      items: Array<{
        timestamp?: string;
        bucket?: string;
        data?: Record<string, unknown>;
        count?: number;
        avgTemperature?: number;
        avgHumidity?: number;
        minTemperature?: number;
        maxTemperature?: number;
        minHumidity?: number;
        maxHumidity?: number;
      }>;
      aggregated: boolean;
      interval?: string;
    }>(`/telemetry/${deviceId}${queryString ? `?${queryString}` : ''}`);
  }

  async getLatestTelemetry(deviceId: string) {
    return this.fetch<{
      timestamp: string;
      data: Record<string, unknown>;
    } | null>(`/telemetry/${deviceId}/latest`);
  }

  async getTelemetryStats(deviceId: string, params?: {
    startTime?: string;
    endTime?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.startTime) query.set('startTime', params.startTime);
    if (params?.endTime) query.set('endTime', params.endTime);
    const queryString = query.toString();
    return this.fetch<{
      count: number;
      firstReading?: string;
      lastReading?: string;
      fields: Record<string, { min: number; max: number; avg: number; count: number }>;
    }>(`/telemetry/${deviceId}/stats${queryString ? `?${queryString}` : ''}`);
  }

  async getTelemetrySchema(deviceId: string) {
    return this.fetch<{
      schema: {
        fields: Array<{
          key: string;
          label: string;
          type: 'number' | 'boolean' | 'string' | 'enum';
          unit?: string;
          icon?: string;
          color?: string;
          min?: number;
          max?: number;
          precision?: number;
          values?: string[];
          chartType?: 'line' | 'bar' | 'gauge' | 'boolean';
          showInStats?: boolean;
          showInChart?: boolean;
        }>;
      } | null;
      discovered: Array<{
        key: string;
        label: string;
        type: 'number' | 'boolean' | 'string';
        unit?: string;
        icon?: string;
        color?: string;
        chartType?: string;
      }>;
    }>(`/telemetry/${deviceId}/schema`);
  }

  // Device Types
  async getDeviceTypes() {
    return this.fetch<Array<{
      id: string;
      name: string;
      slug: string;
      description?: string;
      icon: string;
      color: string;
      schema: {
        fields: Array<{
          key: string;
          label: string;
          type: string;
          unit?: string;
          icon?: string;
          color?: string;
        }>;
      };
      isSystem: boolean;
      _count: { devices: number };
      createdAt: string;
      updatedAt: string;
    }>>('/device-types');
  }

  async getDeviceType(id: string) {
    return this.fetch<{
      id: string;
      name: string;
      slug: string;
      description?: string;
      icon: string;
      color: string;
      schema: {
        fields: Array<{
          key: string;
          label: string;
          type: string;
          unit?: string;
          icon?: string;
          color?: string;
        }>;
      };
      isSystem: boolean;
      _count: { devices: number };
    }>(`/device-types/${id}`);
  }

  async createDeviceType(data: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    schema: {
      fields: Array<{
        key: string;
        label: string;
        type: 'number' | 'boolean' | 'string' | 'enum';
        unit?: string;
        icon?: string;
        color?: string;
        min?: number;
        max?: number;
        precision?: number;
        values?: string[];
        chartType?: 'line' | 'bar' | 'gauge' | 'boolean';
      }>;
    };
  }) {
    return this.fetch<{
      id: string;
      name: string;
      slug: string;
    }>('/device-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createDeviceTypeFromPreset(presetSlug: string) {
    return this.fetch<{
      id: string;
      name: string;
      slug: string;
    }>(`/device-types/presets/${presetSlug}`, {
      method: 'POST',
    });
  }

  async getAvailablePresets() {
    return this.fetch<Array<{
      slug: string;
      name: string;
      description?: string;
      icon?: string;
      color?: string;
      fieldCount: number;
    }>>('/device-types/presets');
  }

  async updateDeviceType(id: string, data: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    schema?: {
      fields: Array<{
        key: string;
        label: string;
        type: 'number' | 'boolean' | 'string' | 'enum';
        unit?: string;
        icon?: string;
        color?: string;
      }>;
    };
  }) {
    return this.fetch<{
      id: string;
      name: string;
      slug: string;
    }>(`/device-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDeviceType(id: string) {
    return this.fetch<void>(`/device-types/${id}`, {
      method: 'DELETE',
    });
  }

  // Alerts
  async getAlerts(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    deviceId?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.deviceId) query.set('deviceId', params.deviceId);
    const queryString = query.toString();
    return this.fetch<{
      items: Array<{
        id: string;
        ruleId: string;
        ruleName: string;
        ruleType: string;
        deviceId: string;
        status: string;
        metadata: Record<string, unknown>;
        triggeredAt: string;
        resolvedAt?: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/alerts${queryString ? `?${queryString}` : ''}`);
  }

  async acknowledgeAlert(alertId: string) {
    return this.fetch<{ id: string; status: string }>(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  }

  async resolveAlert(alertId: string) {
    return this.fetch<{ id: string; status: string }>(`/alerts/${alertId}/resolve`, {
      method: 'POST',
    });
  }

  async getActiveAlertsCount() {
    return this.fetch<{ count: number }>('/alerts/stats/active-count');
  }

  async getAlertRules(params?: {
    page?: number;
    pageSize?: number;
    deviceId?: string;
    type?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.deviceId) query.set('deviceId', params.deviceId);
    if (params?.type) query.set('type', params.type);
    const queryString = query.toString();
    return this.fetch<{
      items: Array<{
        id: string;
        name: string;
        type: string;
        condition: Record<string, unknown>;
        enabled: boolean;
        deviceId?: string;
        deviceName?: string;
        alertCount: number;
        createdAt: string;
        updatedAt: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/alerts/rules${queryString ? `?${queryString}` : ''}`);
  }

  async createAlertRule(data: {
    name: string;
    type: 'device_offline' | 'threshold' | 'no_data';
    condition: Record<string, unknown>;
    deviceId?: string;
    enabled?: boolean;
  }) {
    return this.fetch<{
      id: string;
      name: string;
      type: string;
      condition: Record<string, unknown>;
      enabled: boolean;
    }>('/alerts/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAlertRule(ruleId: string, data: {
    name?: string;
    type?: 'device_offline' | 'threshold' | 'no_data';
    condition?: Record<string, unknown>;
    enabled?: boolean;
  }) {
    return this.fetch<{
      id: string;
      name: string;
      type: string;
      condition: Record<string, unknown>;
      enabled: boolean;
    }>(`/alerts/rules/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAlertRule(ruleId: string) {
    return this.fetch<void>(`/alerts/rules/${ruleId}`, {
      method: 'DELETE',
    });
  }

  // Audit Logs
  async getAuditLogs(params?: {
    page?: number;
    pageSize?: number;
    action?: string;
    resourceType?: string;
    userId?: string;
    startTime?: string;
    endTime?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.action) query.set('action', params.action);
    if (params?.resourceType) query.set('resourceType', params.resourceType);
    if (params?.userId) query.set('userId', params.userId);
    if (params?.startTime) query.set('startTime', params.startTime);
    if (params?.endTime) query.set('endTime', params.endTime);
    const queryString = query.toString();
    return this.fetch<{
      items: Array<{
        id: string;
        action: string;
        resourceType?: string;
        resourceId?: string;
        metadata: Record<string, unknown>;
        createdAt: string;
        user: { id: string; email: string; name?: string } | null;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/audit${queryString ? `?${queryString}` : ''}`);
  }

  async getAuditActions() {
    return this.fetch<string[]>('/audit/actions');
  }

  async getAuditResourceTypes() {
    return this.fetch<string[]>('/audit/resource-types');
  }

  async getResourceAuditLogs(resourceType: string, resourceId: string, params?: {
    page?: number;
    pageSize?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    const queryString = query.toString();
    return this.fetch<{
      items: Array<{
        id: string;
        action: string;
        metadata: Record<string, unknown>;
        createdAt: string;
        user: { id: string; email: string; name?: string } | null;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/audit/resource/${resourceType}/${resourceId}${queryString ? `?${queryString}` : ''}`);
  }
}

export const api = new ApiClient();
