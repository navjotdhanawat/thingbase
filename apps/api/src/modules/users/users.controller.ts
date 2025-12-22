import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { AdminOnly } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createUserSchema, updateUserSchema, inviteUserSchema } from '@repo/shared';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users', description: 'Get all users in tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.usersService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user', description: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = await this.usersService.findById(tenantId, id);
    return {
      success: true,
      data: user,
    };
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Create user', description: 'Create a new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createUserSchema)) body: any,
  ) {
    const user = await this.usersService.create(tenantId, body);
    return {
      success: true,
      data: user,
    };
  }

  @Post('invite')
  @AdminOnly()
  @ApiOperation({ summary: 'Invite user', description: 'Send invite email to new user (admin only)' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  async invite(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(inviteUserSchema)) body: any,
  ) {
    const user = await this.usersService.invite(tenantId, body);
    return {
      success: true,
      data: user,
    };
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Update user', description: 'Update user details (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: any,
  ) {
    const user = await this.usersService.update(tenantId, id, body);
    return {
      success: true,
      data: user,
    };
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Delete user', description: 'Delete user (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async delete(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.usersService.delete(tenantId, id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}


