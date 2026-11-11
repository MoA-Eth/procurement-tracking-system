import { z } from 'zod';

export const DisbursementSchema = z.object({
  referenceNo: z.string().min(1, 'Voucher reference is required').max(100),
  payeeName: z.string().min(1, 'Payee/Beneficiary name is required').max(255),
  amount: z.number().positive('Amount must be positive'),
  category: z.enum([
    'PROCUREMENT_GOODS',
    'CONTRACTOR_WORKS',
    'PROJECT_GRANT',
    'OPERATIONAL_ADMIN',
    'OTHER_GENERAL',
  ]),
  paymentMethod: z.enum(['BANK_TRANSFER', 'CHEQUE_CPO', 'CASH']),
  paymentDate: z.string().min(1, 'Payment date is required'),
  remarks: z.string().max(1000).optional(),
  contractId: z.string().optional().nullable(),
  paymentType: z
    .enum([
      'ADVANCE',
      'INTERIM_1',
      'INTERIM_2',
      'FINAL',
      'RETENTION_WITHHOLDING',
      'RETENTION_PAYMENT',
      'OTHER',
    ])
    .optional()
    .nullable(),
});

export type DisbursementInput = z.infer<typeof DisbursementSchema>;

export const SmsSettingsSchema = z.object({
  smsEnabled: z.boolean(),
  gatewayUrl: z.string().url('Must be a valid URL').or(z.string().max(0)),
  gatewayApiKey: z.string().max(500),
  thresholdEtb: z.number().positive().int(),
  recipients: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().min(7).max(20),
  })),
  mockMode: z.boolean().optional(),
});

export type SmsSettingsInput = z.infer<typeof SmsSettingsSchema>;
