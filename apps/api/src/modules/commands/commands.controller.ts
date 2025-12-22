import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CommandsService } from './commands.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createCommandSchema } from '@repo/shared';

@ApiTags('Commands')
@ApiBearerAuth('access-token')
@Controller('commands')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommandsController {
  constructor(private readonly commands: CommandsService) {}

  @Get()
  @ApiOperation({ summary: 'List commands', description: 'Get command history for tenant or specific device' })
  @ApiQuery({ name: 'deviceId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of commands' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('deviceId') deviceId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.commands.findAll(tenantId, {
      deviceId,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get command', description: 'Get command details by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Command details' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const command = await this.commands.findOne(tenantId, id);
    return {
      success: true,
      data: command,
    };
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Send command', description: 'Send a command to a device (admin only)' })
  @ApiResponse({ status: 201, description: 'Command sent' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async sendCommand(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createCommandSchema))
    dto: { deviceId: string; type: string; payload: Record<string, unknown> },
  ) {
    const result = await this.commands.sendCommand(tenantId, dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post(':id/retry')
  @Roles('admin')
  @ApiOperation({ summary: 'Retry command', description: 'Retry a failed or timed-out command (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Command retried' })
  @ApiResponse({ status: 400, description: 'Command cannot be retried' })
  async retryCommand(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.commands.retryCommand(tenantId, id);
    return {
      success: true,
      data: result,
    };
  }
}
