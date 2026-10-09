/**
 * EmailService: Serviço de envio de emails
 *
 * Suporta:
 * - Nodemailer (local ou com smtp)
 * - SendGrid (via API)
 * - AWS SES (via AWS SDK)
 */

export interface EmailConfig {
  enabled: boolean;
  provider?: 'nodemailer' | 'sendgrid' | 'aws-ses';
  from?: string;
  to?: string;
  // Para Nodemailer
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  // Para SendGrid
  sendgridApiKey?: string;
  // Para AWS SES
  awsRegion?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export class EmailService {
  private config: EmailConfig;
  private nodemailer: any = null;

  constructor(config: EmailConfig) {
    this.config = {
      enabled: config.enabled ?? false,
      provider: config.provider ?? 'nodemailer',
      from: config.from ?? 'automacao@calandrini.com.br',
      sendgridApiKey: config.sendgridApiKey,
      awsRegion: config.awsRegion,
      smtpConfig: config.smtpConfig,
      to: config.to,
    };

    console.log('[EmailService] Initialized with provider:', this.config.provider);
  }

  /**
   * Enviar email
   */
  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.config.enabled) {
      console.log('[EmailService] Email disabled, skipping send');
      return { success: false, error: 'Email service disabled' };
    }

    try {
      const from = payload.from || this.config.from || 'automacao@calandrini.com.br';

      if (this.config.provider === 'nodemailer') {
        return await this.sendViaNodemailer(from as string, payload);
      } else if (this.config.provider === 'sendgrid') {
        return await this.sendViaSendGrid(from as string, payload);
      } else if (this.config.provider === 'aws-ses') {
        return await this.sendViaAwsSES(from as string, payload);
      }

      return { success: false, error: 'Unknown provider' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[EmailService] Error sending email:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Enviar via Nodemailer
   */
  private async sendViaNodemailer(
    from: string,
    payload: EmailPayload
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Importar dinamicamente para não ser obrigatório
      if (!this.nodemailer) {
        // @ts-expect-error nodemailer is optional dependency
        this.nodemailer = await import('nodemailer');
      }

      // Se não houver config SMTP, usar fake mailer (para desenvolvimento)
      const transporter = this.config.smtpConfig
        ? this.nodemailer.createTransport(this.config.smtpConfig)
        : this.nodemailer.createTestAccount().then((testAccount: any) =>
            this.nodemailer.createTransport({
              host: 'smtp.ethereal.email',
              port: 587,
              secure: false,
              auth: {
                user: testAccount.user,
                pass: testAccount.pass,
              },
            })
          );

      const info = await (await transporter).sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || payload.html.replace(/<[^>]*>/g, ''),
      });

      console.log('[EmailService] ✅ Email sent via Nodemailer:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[EmailService] ❌ Nodemailer error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Enviar via SendGrid
   */
  private async sendViaSendGrid(
    from: string,
    payload: EmailPayload
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.config.sendgridApiKey) {
        throw new Error('SendGrid API key not configured');
      }

      // @ts-expect-error @sendgrid/mail is optional dependency
      const sgMail = await import('@sendgrid/mail');
      sgMail.setApiKey(this.config.sendgridApiKey);

      const result = await sgMail.send({
        to: payload.to,
        from,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      console.log('[EmailService] ✅ Email sent via SendGrid');
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[EmailService] ❌ SendGrid error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Enviar via AWS SES
   */
  private async sendViaAwsSES(
    from: string,
    payload: EmailPayload
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.config.awsRegion) {
        throw new Error('AWS region not configured');
      }

      // @ts-expect-error aws-sdk is optional dependency
      const AWS = await import('aws-sdk');
      const ses = new AWS.SES({ region: this.config.awsRegion });

      const result = await ses
        .sendEmail({
          Source: from,
          Destination: {
            ToAddresses: [payload.to],
          },
          Message: {
            Subject: {
              Data: payload.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: payload.html,
                Charset: 'UTF-8',
              },
              ...(payload.text && {
                Text: {
                  Data: payload.text,
                  Charset: 'UTF-8',
                },
              }),
            },
          },
        })
        .promise();

      console.log('[EmailService] ✅ Email sent via AWS SES');
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[EmailService] ❌ AWS SES error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Verificar se email está configurado
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Obter configuração
   */
  getConfig(): EmailConfig {
    return this.config;
  }
}

/**
 * Singleton global
 */
let globalEmailService: EmailService | null = null;

export function getEmailService(config?: EmailConfig): EmailService {
  if (!globalEmailService) {
    globalEmailService = new EmailService(config || {
      enabled: process.env.EMAIL_ENABLED === 'true',
      provider: (process.env.EMAIL_PROVIDER as any) || 'nodemailer',
      from: process.env.EMAIL_FROM,
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      awsRegion: process.env.AWS_REGION,
      smtpConfig: process.env.SMTP_HOST
        ? {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER || '',
              pass: process.env.SMTP_PASS || '',
            },
          }
        : undefined,
    });
  }
  return globalEmailService;
}

export function resetEmailService(): void {
  globalEmailService = null;
}
