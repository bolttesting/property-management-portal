import { emailService } from './email.service';

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleString('en-GB', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

export const notifications = {
  async welcomeEmail(options: { email?: string | null; name?: string | null; accountType: 'tenant' | 'owner'; dashboardUrl?: string }) {
    if (!options.email) {
      return;
    }
    try {
      await emailService.sendTemplate('account.welcome', {
        to: { address: options.email, name: options.name ?? undefined },
        context: {
          recipientName: options.name || 'there',
          accountType: options.accountType === 'owner' ? 'property owner' : 'tenant',
          isOwner: options.accountType === 'owner',
          dashboardUrl: options.dashboardUrl || 'https://property-management-frontend-production.up.railway.app',
          ownerInstructions:
            options.accountType === 'owner'
              ? 'Our admin team will review your submission shortly. We will notify you once the account is approved.'
              : null,
        },
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  },

  async ownerStatusEmail(options: { email?: string | null; name?: string | null; approved: boolean; reason?: string | null; dashboardUrl?: string }) {
    if (!options.email) return;
    try {
      await emailService.sendTemplate('owner.statusUpdate', {
        to: { address: options.email, name: options.name ?? undefined },
        context: {
          ownerName: options.name || 'there',
          isApproved: options.approved,
          rejectionReason: options.reason || null,
          dashboardUrl: options.dashboardUrl || 'https://property-management-frontend-production.up.railway.app/owner/dashboard',
        },
      });
    } catch (error) {
      console.error('Failed to send owner status email:', error);
    }
  },

  async applicationSubmittedOwner(options: {
    ownerEmail?: string | null;
    ownerName?: string | null;
    tenantName?: string | null;
    propertyName?: string | null;
    offerAmount?: number | null;
    submittedAt?: string | Date | null;
    applicantEmail?: string | null;
    applicantMobile?: string | null;
  }) {
    if (!options.ownerEmail) return;
    try {
      await emailService.sendTemplate('application.submitted.owner', {
        to: { address: options.ownerEmail, name: options.ownerName ?? undefined },
        context: {
          ownerName: options.ownerName || 'there',
          ownerEmail: options.ownerEmail,
          tenantName: options.tenantName || 'A prospective tenant',
          propertyName: options.propertyName || 'your property',
          offerAmount: options.offerAmount ? Number(options.offerAmount).toLocaleString() : null,
          submittedAt: formatDateTime(options.submittedAt) || new Date().toLocaleString(),
          applicantEmail: options.applicantEmail || null,
          applicantMobile: options.applicantMobile || null,
        },
      });
    } catch (error) {
      console.error('Failed to send owner application submission email:', error);
    }
  },

  async applicationSubmittedTenant(options: { tenantEmail?: string | null; tenantName?: string | null; propertyName?: string | null }) {
    if (!options.tenantEmail) return;
    try {
      await emailService.sendTemplate('application.submitted.tenant', {
        to: { address: options.tenantEmail, name: options.tenantName ?? undefined },
      context: {
          tenantName: options.tenantName || 'there',
          tenantEmail: options.tenantEmail,
          propertyName: options.propertyName || 'the property',
        },
      });
    } catch (error) {
      console.error('Failed to send tenant application acknowledgement:', error);
    }
  },

  async applicationStatusUpdated(options: {
    email?: string | null;
    name?: string | null;
    propertyName?: string | null;
    status: string;
    message?: string | null;
    rejectionReason?: string | null;
    leaseStartDate?: string | Date | null;
    leaseEndDate?: string | Date | null;
    rentAmount?: number | null;
    forTenant?: boolean;
  }) {
    if (!options.email) return;
    try {
      await emailService.sendTemplate('application.statusUpdated', {
        to: { address: options.email, name: options.name ?? undefined },
        context: {
          recipientName: options.name || 'there',
          propertyName: options.propertyName || 'the property',
          status: options.status,
          message: options.message || null,
          rejectionReason: options.rejectionReason || null,
          forTenant: options.forTenant ?? false,
          leaseDetails:
            options.leaseStartDate || options.leaseEndDate || options.rentAmount
              ? {
                  startDate: formatDate(options.leaseStartDate),
                  endDate: formatDate(options.leaseEndDate),
                  rentAmount: options.rentAmount ? Number(options.rentAmount).toLocaleString() : null,
                }
              : null,
        },
      });
    } catch (error) {
      console.error('Failed to send application status email:', error);
    }
  },

  async viewingScheduled(options: {
    recipientEmail?: string | null;
    recipientName?: string | null;
    propertyName?: string | null;
    viewingDate?: string | Date | null;
    viewingTime?: string | null;
    applicantName?: string | null;
    applicantEmail?: string | null;
    applicantMobile?: string | null;
    notes?: string | null;
  }) {
    if (!options.recipientEmail) return;
    try {
      await emailService.sendTemplate('viewing.scheduled', {
        to: { address: options.recipientEmail, name: options.recipientName ?? undefined },
        context: {
          recipientName: options.recipientName || 'there',
          propertyName: options.propertyName || 'the property',
          viewingDate: formatDate(options.viewingDate) || options.viewingDate || 'TBA',
          viewingTime: options.viewingTime || 'TBA',
          applicantName: options.applicantName || null,
          applicantEmail: options.applicantEmail || null,
          applicantMobile: options.applicantMobile || null,
          notes: options.notes || null,
        },
      });
    } catch (error) {
      console.error('Failed to send viewing scheduled email:', error);
    }
  },

  async viewingStatusUpdated(options: {
    recipientEmail?: string | null;
    recipientName?: string | null;
    propertyName?: string | null;
    status: string;
    cancellationReason?: string | null;
    nextSteps?: string | null;
  }) {
    if (!options.recipientEmail) return;
    try {
      await emailService.sendTemplate('viewing.statusUpdated', {
        to: { address: options.recipientEmail, name: options.recipientName ?? undefined },
        context: {
          recipientName: options.recipientName || 'there',
          propertyName: options.propertyName || 'the property',
          status: options.status,
          cancellationReason: options.cancellationReason || null,
          nextSteps: options.nextSteps || null,
        },
      });
    } catch (error) {
      console.error('Failed to send viewing status email:', error);
    }
  },

  async leaseNotification(options: {
    recipientEmail?: string | null;
    recipientName?: string | null;
    propertyName?: string | null;
    action: 'created' | 'updated' | 'renewed' | 'terminated';
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    rentAmount?: number | null;
    additionalNotes?: string | null;
  }) {
    if (!options.recipientEmail) return;
    try {
      await emailService.sendTemplate('lease.notification', {
        to: { address: options.recipientEmail, name: options.recipientName ?? undefined },
        context: {
          recipientName: options.recipientName || 'there',
          propertyName: options.propertyName || 'the property',
          action: options.action,
          leaseDetails: {
            startDate: formatDate(options.startDate),
            endDate: formatDate(options.endDate),
            rentAmount: options.rentAmount ? Number(options.rentAmount).toLocaleString() : null,
          },
          additionalNotes: options.additionalNotes || null,
        },
      });
    } catch (error) {
      console.error('Failed to send lease notification email:', error);
    }
  },
};

