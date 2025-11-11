import fs from 'fs';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import handlebars from 'handlebars';
import { loadEmailConfig, EmailConfig } from '../../config/email';
import { emailTemplates, EmailTemplateKey } from './templates';
import { resendClient } from './resendClient';

interface EmailRecipient {
  name?: string | null;
  address: string;
}

interface SendTemplateOptions {
  to: EmailRecipient | EmailRecipient[];
  cc?: EmailRecipient | EmailRecipient[];
  bcc?: EmailRecipient | EmailRecipient[];
  context: Record<string, any>;
}

type CompiledTemplate = handlebars.TemplateDelegate<any>;

export class EmailService {
  private transporter: Transporter | null = null;
  private emailConfig: EmailConfig | null = null;
  private templateCache = new Map<string, CompiledTemplate>();

  constructor() {
    this.emailConfig = loadEmailConfig();

    if (this.emailConfig) {
      this.transporter = nodemailer.createTransport({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        requireTLS: this.emailConfig.requireTLS,
        auth: {
          user: this.emailConfig.user,
          pass: this.emailConfig.pass,
        },
        tls: {
          rejectUnauthorized: this.emailConfig.rejectUnauthorized,
        },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 20000,
      });
      console.log('[Email] Transporter created with config:', {
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        requireTLS: this.emailConfig.requireTLS,
        rejectUnauthorized: this.emailConfig.rejectUnauthorized,
      });
    } else {
      console.warn('Email notifications are disabled (missing SMTP configuration).');
    }
  }

  private resolveRecipients(input?: EmailRecipient | EmailRecipient[]) {
    if (!input) return undefined;
    const list = Array.isArray(input) ? input : [input];
    const resolved: Array<string | { name: string; address: string }> = list
      .filter((recipient) => !!recipient.address)
      .map((recipient) => {
        if (recipient.name && recipient.name.trim() !== '') {
          return {
            name: recipient.name.trim(),
            address: recipient.address,
          };
        }
        return recipient.address;
      });

    return resolved.length > 0 ? resolved : undefined;
  }

  private getTemplate(templateKey: EmailTemplateKey): CompiledTemplate {
    if (this.templateCache.has(templateKey)) {
      return this.templateCache.get(templateKey)!;
    }

    const templateDef = emailTemplates[templateKey];
    if (!templateDef) {
      throw new Error(`Unknown email template: ${templateKey}`);
    }

    let templatePath = templateDef.file;
    if (!fs.existsSync(templatePath)) {
      const fallbackPath = path.join(
        __dirname,
        '../../..',
        'src',
        'services',
        'email',
        'templates',
        path.basename(templatePath)
      );
      if (fs.existsSync(fallbackPath)) {
        templatePath = fallbackPath;
      } else {
        throw new Error(`Email template file not found: ${templatePath}`);
      }
    }

    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const compiled = handlebars.compile(templateSource);
    this.templateCache.set(templateKey, compiled);
    return compiled;
  }

  async sendTemplate(templateKey: EmailTemplateKey, options: SendTemplateOptions) {
    const template = this.getTemplate(templateKey);
    const templateDef = emailTemplates[templateKey];

    const renderedHtml = template({
      ...options.context,
    });

    const subjectTemplate = handlebars.compile(templateDef.subject);
    const renderedSubject = subjectTemplate(options.context);

    const fromName =
      process.env.RESEND_FROM_NAME ??
      this.emailConfig?.fromName ??
      'Property UAE Notifications';
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ??
      this.emailConfig?.fromEmail ??
      'onboarding@resend.dev';

    if (resendClient && process.env.RESEND_API_KEY) {
      await resendClient.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: this.resolveRecipients(options.to),
        cc: this.resolveRecipients(options.cc),
        bcc: this.resolveRecipients(options.bcc),
        subject: renderedSubject,
        html: renderedHtml,
      });
      return;
    }

    if (!this.transporter || !this.emailConfig) {
      console.warn(`Skipped sending email for template ${templateKey}: SMTP and Resend not configured.`);
      return;
    }

    await this.transporter.sendMail({
      from: {
        name: fromName,
        address: fromEmail,
      },
      to: this.resolveRecipients(options.to),
      cc: this.resolveRecipients(options.cc),
      bcc: this.resolveRecipients(options.bcc),
      subject: renderedSubject,
      html: renderedHtml,
    });
  }
}

export const emailService = new EmailService();

