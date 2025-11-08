export type MovePermitType = 'move_in' | 'move_out'

export const MOVE_PERMIT_REQUIRED_KEYS: Record<MovePermitType, string[]> = {
  move_in: [
    'emiratesIdFrontUrl',
    'emiratesIdBackUrl',
    'passportCopyUrl',
    'residenceVisaUrl',
    'ejariCertificateUrl',
    'tenancyContractUrl',
    'landlordNocUrl',
    'buildingAccessPassUrl',
    'securityDepositReceiptUrl',
    'movingCompanyLicenseUrl',
    'movingCompanyInsuranceUrl',
    'elevatorBookingFormUrl',
  ],
  move_out: [
    'emiratesIdFrontUrl',
    'emiratesIdBackUrl',
    'passportCopyUrl',
    'residenceVisaUrl',
    'ejariCertificateUrl',
    'tenancyContractUrl',
    'buildingClearanceCertificateUrl',
    'utilityClearanceCertificatesUrl',
    'movingCompanyLicenseUrl',
    'movingCompanyInsuranceUrl',
    'elevatorBookingFormUrl',
    'finalBillReceiptsUrl',
  ],
}

export const MOVE_PERMIT_DOCUMENT_FIELDS: Record<MovePermitType, Array<{ key: string; label: string; description: string }>> = {
  move_in: [
    {
      key: 'emiratesIdFrontUrl',
      label: 'Emirates ID (Front)',
      description: 'Clear coloured scan of the front side of the Emirates ID',
    },
    {
      key: 'emiratesIdBackUrl',
      label: 'Emirates ID (Back)',
      description: 'Clear coloured scan of the reverse side of the Emirates ID',
    },
    {
      key: 'passportCopyUrl',
      label: 'Passport Copy',
      description: 'Latest passport copy for the main tenant',
    },
    {
      key: 'residenceVisaUrl',
      label: 'Residence Visa Page',
      description: 'Valid UAE residence visa page for the tenant',
    },
    {
      key: 'ejariCertificateUrl',
      label: 'Ejari Certificate',
      description: 'Registered Ejari certificate covering the lease period',
    },
    {
      key: 'tenancyContractUrl',
      label: 'Signed Tenancy Contract',
      description: 'Signed tenancy / lease agreement',
    },
    {
      key: 'landlordNocUrl',
      label: 'Landlord / Property Owner NOC',
      description: 'Move-in No Objection Certificate from the landlord or property manager',
    },
    {
      key: 'buildingAccessPassUrl',
      label: 'Building / Community Access Pass',
      description: 'Building-issued move-in permit or access letter',
    },
    {
      key: 'securityDepositReceiptUrl',
      label: 'Security Deposit Receipt',
      description: 'Proof of payment for security deposit and move-in fees',
    },
    {
      key: 'movingCompanyLicenseUrl',
      label: 'Moving Company Trade License',
      description: 'Current trade license copy for the appointed moving company',
    },
    {
      key: 'movingCompanyInsuranceUrl',
      label: 'Moving Company Insurance Certificate',
      description: 'Public liability insurance certificate for the moving company',
    },
    {
      key: 'elevatorBookingFormUrl',
      label: 'Elevator / Service Lift Booking Form',
      description: 'Approved service lift booking or reservation form',
    },
  ],
  move_out: [
    {
      key: 'emiratesIdFrontUrl',
      label: 'Emirates ID (Front)',
      description: 'Clear coloured scan of the front side of the Emirates ID',
    },
    {
      key: 'emiratesIdBackUrl',
      label: 'Emirates ID (Back)',
      description: 'Clear coloured scan of the reverse side of the Emirates ID',
    },
    {
      key: 'passportCopyUrl',
      label: 'Passport Copy',
      description: 'Latest passport copy for the main tenant',
    },
    {
      key: 'residenceVisaUrl',
      label: 'Residence Visa Page',
      description: 'Valid UAE residence visa page for the tenant',
    },
    {
      key: 'ejariCertificateUrl',
      label: 'Ejari Certificate / Cancellation Receipt',
      description: 'Ejari certificate or cancellation confirmation covering the tenancy',
    },
    {
      key: 'tenancyContractUrl',
      label: 'Signed Tenancy Contract',
      description: 'Signed tenancy / lease agreement',
    },
    {
      key: 'buildingClearanceCertificateUrl',
      label: 'Building Clearance Certificate',
      description: 'Move-out clearance form signed by building / community management',
    },
    {
      key: 'utilityClearanceCertificatesUrl',
      label: 'Utility Clearance Certificates',
      description: 'DEWA / ADDC / SEWA clearance certificates and final meter readings',
    },
    {
      key: 'movingCompanyLicenseUrl',
      label: 'Moving Company Trade License',
      description: 'Current trade license copy for the appointed moving company',
    },
    {
      key: 'movingCompanyInsuranceUrl',
      label: 'Moving Company Insurance Certificate',
      description: 'Public liability insurance certificate for the moving company',
    },
    {
      key: 'elevatorBookingFormUrl',
      label: 'Elevator / Service Lift Booking Form',
      description: 'Approved service lift booking or reservation form',
    },
    {
      key: 'finalBillReceiptsUrl',
      label: 'Final Bills & Payment Receipts',
      description: 'Receipts for any outstanding community, maintenance, or service charges',
    },
  ],
}

const documentLabels: Record<string, string> = {};
[...MOVE_PERMIT_DOCUMENT_FIELDS.move_in, ...MOVE_PERMIT_DOCUMENT_FIELDS.move_out].forEach((field) => {
  if (!documentLabels[field.key]) {
    documentLabels[field.key] = field.label;
  }
});

export const MOVE_PERMIT_DOCUMENT_LABELS = documentLabels;

export const MOVE_PERMIT_TIME_SLOTS = [
  '08:00 – 10:00',
  '10:00 – 12:00',
  '12:00 – 14:00',
  '14:00 – 16:00',
  '16:00 – 18:00',
];


