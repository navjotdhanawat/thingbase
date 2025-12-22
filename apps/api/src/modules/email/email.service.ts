import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly frontendUrl: string;
  private readonly isDevelopment: boolean;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('email.apiKey');
    this.from = this.config.get<string>('email.from') || 'noreply@example.com';
    this.frontendUrl = this.config.get<string>('email.frontendUrl') || 'http://localhost:3000';
    this.isDevelopment = this.config.get<string>('nodeEnv') === 'development';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service initialized with Resend');
    } else {
      this.resend = null;
      this.logger.warn('Email service running in mock mode (no RESEND_API_KEY)');
    }
  }

  /**
   * Send an email. In development without API key, logs to console instead.
   */
  async send(options: SendEmailOptions): Promise<boolean> {
    if (!this.resend) {
      // Mock mode - log email to console
      this.logger.log('='.repeat(60));
      this.logger.log('📧 EMAIL (mock mode)');
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`Subject: ${options.subject}`);
      this.logger.log('-'.repeat(60));
      this.logger.log(options.html.replace(/<[^>]*>/g, '')); // Strip HTML for readability
      this.logger.log('='.repeat(60));
      return true;
    }

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (result.error) {
        this.logger.error(`Failed to send email: ${result.error.message}`);
        return false;
      }

      this.logger.log(`Email sent to ${options.to}: ${result.data?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      return false;
    }
  }

  /**
   * Send invitation email to new user
   */
  async sendInvitation(params: {
    to: string;
    tenantName: string;
    inviteToken: string;
    inviterName?: string;
  }): Promise<boolean> {
    const inviteUrl = `${this.frontendUrl}/accept-invite?token=${params.inviteToken}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        ${params.inviterName ? `${params.inviterName} has invited you` : "You've been invited"} to join <strong>${params.tenantName}</strong> on the IoT Platform.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Click the button below to set up your account and get started.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.
      </p>
    </div>
    <div style="background: #f9fafb; padding: 20px 32px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        IoT Platform • Device Management Made Simple
      </p>
    </div>
  </div>
</body>
</html>
    `;

    return this.send({
      to: params.to,
      subject: `You're invited to join ${params.tenantName}`,
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(params: {
    to: string;
    resetToken: string;
    userName?: string;
  }): Promise<boolean> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${params.resetToken}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Hi${params.userName ? ` ${params.userName}` : ''},
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
    <div style="background: #f9fafb; padding: 20px 32px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        IoT Platform • Device Management Made Simple
      </p>
    </div>
  </div>
</body>
</html>
    `;

    return this.send({
      to: params.to,
      subject: 'Reset your password',
      html,
    });
  }

  /**
   * Send alert notification email
   */
  async sendAlertNotification(params: {
    to: string;
    alertType: string;
    deviceName: string;
    message: string;
    deviceId: string;
  }): Promise<boolean> {
    const deviceUrl = `${this.frontendUrl}/devices/${params.deviceId}`;
    
    const alertColors: Record<string, string> = {
      device_offline: '#ef4444',
      threshold: '#f59e0b',
      no_data: '#8b5cf6',
    };
    
    const alertColor = alertColors[params.alertType] || '#3b82f6';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: ${alertColor}; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Alert Triggered</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        An alert has been triggered for device <strong>${params.deviceName}</strong>.
      </p>
      <div style="background: #f9fafb; border-left: 4px solid ${alertColor}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
        <p style="color: #374151; font-size: 16px; margin: 0;">
          ${params.message}
        </p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${deviceUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          View Device
        </a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 20px 32px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        IoT Platform • Device Management Made Simple
      </p>
    </div>
  </div>
</body>
</html>
    `;

    return this.send({
      to: params.to,
      subject: `Alert: ${params.deviceName} - ${params.alertType.replace('_', ' ')}`,
      html,
    });
  }
}

