import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  UseGuards,
  ParseUUIDPipe,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Telemetry')
@ApiBearerAuth('access-token')
@Controller('telemetry')
@UseGuards(JwtAuthGuard)
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get(':deviceId')
  @ApiOperation({ summary: 'Get telemetry', description: 'Get telemetry data for a device with optional aggregation' })
  @ApiParam({ name: 'deviceId', type: String })
  @ApiQuery({ name: 'startTime', required: false, type: String, description: 'ISO timestamp' })
  @ApiQuery({ name: 'endTime', required: false, type: String, description: 'ISO timestamp' })
  @ApiQuery({ name: 'interval', required: false, enum: ['1m', '5m', '1h', '1d'], description: 'Aggregation interval' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Telemetry data' })
  async getTelemetry(
    @CurrentTenant() tenantId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('interval') interval?: '1m' | '5m' | '1h' | '1d',
    @Query('limit') limit?: string,
  ) {
    // If interval is specified, return aggregated data
    if (interval) {
      const data = await this.telemetryService.getAggregatedTelemetry(
        tenantId,
        deviceId,
        {
          startTime,
          endTime,
          interval,
          limit: limit ? parseInt(limit, 10) : undefined,
        },
      );

      return {
        success: true,
        data: {
          items: data,
          aggregated: true,
          interval,
        },
      };
    }

    // Otherwise return raw data
    const data = await this.telemetryService.getTelemetry(tenantId, deviceId, {
      startTime,
      endTime,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return {
      success: true,
      data: {
        items: data,
        aggregated: false,
      },
    };
  }

  @Get(':deviceId/latest')
  @ApiOperation({ summary: 'Get latest telemetry', description: 'Get most recent telemetry reading' })
  @ApiParam({ name: 'deviceId', type: String })
  @ApiResponse({ status: 200, description: 'Latest telemetry data' })
  async getLatestTelemetry(
    @CurrentTenant() tenantId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ) {
    const data = await this.telemetryService.getLatestTelemetry(
      tenantId,
      deviceId,
    );

    return {
      success: true,
      data,
    };
  }

  @Get(':deviceId/stats')
  @ApiOperation({ summary: 'Get telemetry stats', description: 'Get aggregated statistics (min, max, avg) for telemetry' })
  @ApiParam({ name: 'deviceId', type: String })
  @ApiQuery({ name: 'startTime', required: false, type: String })
  @ApiQuery({ name: 'endTime', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Telemetry statistics' })
  async getTelemetryStats(
    @CurrentTenant() tenantId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    const stats = await this.telemetryService.getTelemetryStats(
      tenantId,
      deviceId,
      { startTime, endTime },
    );

    return {
      success: true,
      data: stats,
    };
  }

  @Get(':deviceId/schema')
  @ApiOperation({ summary: 'Get device schema', description: 'Get telemetry schema from device type or auto-discovered' })
  @ApiParam({ name: 'deviceId', type: String })
  @ApiResponse({ status: 200, description: 'Device telemetry schema' })
  async getDeviceSchema(
    @CurrentTenant() tenantId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ) {
    const schemaInfo = await this.telemetryService.getDeviceSchema(
      tenantId,
      deviceId,
    );

    return {
      success: true,
      data: schemaInfo,
    };
  }

  @Get(':deviceId/export')
  @ApiOperation({ summary: 'Export telemetry', description: 'Export telemetry data as CSV or JSON' })
  @ApiParam({ name: 'deviceId', type: String })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'], description: 'Export format (default: json)' })
  @ApiQuery({ name: 'startTime', required: false, type: String })
  @ApiQuery({ name: 'endTime', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max records (default: 1000)' })
  @ApiResponse({ status: 200, description: 'Exported telemetry data' })
  async exportTelemetry(
    @CurrentTenant() tenantId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Query('format') format: 'csv' | 'json' = 'json',
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('limit') limit?: string,
    @Res() res?: Response,
  ) {
    const data = await this.telemetryService.getTelemetry(tenantId, deviceId, {
      startTime,
      endTime,
      limit: limit ? parseInt(limit, 10) : 1000,
    });

    if (format === 'csv') {
      // Generate CSV
      const csv = this.generateCsv(data);
      const filename = `telemetry-${deviceId}-${new Date().toISOString().split('T')[0]}.csv`;
      
      res!.setHeader('Content-Type', 'text/csv');
      res!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res!.send(csv);
    }

    // JSON format
    const filename = `telemetry-${deviceId}-${new Date().toISOString().split('T')[0]}.json`;
    res!.setHeader('Content-Type', 'application/json');
    res!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res!.json({
      deviceId,
      exportedAt: new Date().toISOString(),
      recordCount: data.length,
      data,
    });
  }

  private generateCsv(data: Array<{ timestamp: Date; data: Record<string, unknown> }>): string {
    if (data.length === 0) {
      return 'timestamp\n';
    }

    // Get all unique keys from the data
    const allKeys = new Set<string>();
    for (const item of data) {
      const itemData = (item.data as any)?.data || item.data;
      Object.keys(itemData).forEach(key => allKeys.add(key));
    }
    const keys = Array.from(allKeys);

    // Header row
    const header = ['timestamp', ...keys].join(',');

    // Data rows
    const rows = data.map(item => {
      const itemData = (item.data as any)?.data || item.data;
      const values = keys.map(key => {
        const value = itemData[key];
        if (value === undefined || value === null) return '';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return String(value);
      });
      return [item.timestamp.toISOString(), ...values].join(',');
    });

    return [header, ...rows].join('\n');
  }
}

