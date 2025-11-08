import path from 'path';

interface TemplateDefinition {
  subject: string;
  file: string;
}

export type EmailTemplateKey =
  | 'maintenance.request.submitted'
  | 'maintenance.request.statusUpdated'
  | 'movePermit.submitted'
  | 'movePermit.statusUpdated'
  | 'account.welcome'
  | 'owner.statusUpdate'
  | 'application.submitted.owner'
  | 'application.submitted.tenant'
  | 'application.statusUpdated'
  | 'viewing.scheduled'
  | 'viewing.statusUpdated'
  | 'lease.notification';

export const emailTemplates: Record<EmailTemplateKey, TemplateDefinition> = {
  'maintenance.request.submitted': {
    subject: 'New maintenance request for {{propertyName}}',
    file: path.join(__dirname, 'maintenance-request-submitted.hbs'),
  },
  'maintenance.request.statusUpdated': {
    subject: 'Maintenance request update for {{propertyName}}',
    file: path.join(__dirname, 'maintenance-request-status-updated.hbs'),
  },
  'movePermit.submitted': {
    subject: 'New move permit request for {{propertyName}}',
    file: path.join(__dirname, 'move-permit-submitted.hbs'),
  },
  'movePermit.statusUpdated': {
    subject: 'Move permit status update for {{propertyName}}',
    file: path.join(__dirname, 'move-permit-status-updated.hbs'),
  },
  'account.welcome': {
    subject: 'Welcome to Property UAE, {{recipientName}}',
    file: path.join(__dirname, 'account-welcome.hbs'),
  },
  'owner.statusUpdate': {
    subject: 'Update on your Property UAE owner application',
    file: path.join(__dirname, 'owner-status-update.hbs'),
  },
  'application.submitted.owner': {
    subject: 'New application submitted for {{propertyName}}',
    file: path.join(__dirname, 'application-submitted-owner.hbs'),
  },
  'application.submitted.tenant': {
    subject: 'We received your application for {{propertyName}}',
    file: path.join(__dirname, 'application-submitted-tenant.hbs'),
  },
  'application.statusUpdated': {
    subject: 'Your application for {{propertyName}} is now {{status}}',
    file: path.join(__dirname, 'application-status-updated.hbs'),
  },
  'viewing.scheduled': {
    subject: 'Viewing scheduled for {{propertyName}}',
    file: path.join(__dirname, 'viewing-scheduled.hbs'),
  },
  'viewing.statusUpdated': {
    subject: 'Viewing update for {{propertyName}}',
    file: path.join(__dirname, 'viewing-status-updated.hbs'),
  },
  'lease.notification': {
    subject: 'Lease {{action}} for {{propertyName}}',
    file: path.join(__dirname, 'lease-notification.hbs'),
  },
};

