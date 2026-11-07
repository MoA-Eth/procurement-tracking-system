import type { Request, Response } from 'express';
import { DisbursementSchema, SmsSettingsSchema } from './finance.schema.js';
import * as financeService from './finance.service.js';
import { ApiError } from '../../utils/errors.js';

export const financeController = {
  async createDisbursement(req: Request, res: Response) {
    const parsed = DisbursementSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw ApiError.badRequest('Validation failed', fieldErrors);
    }
    if (!req.user?.id) throw ApiError.unauthorized('Authentication required');
    const payment = await financeService.createDisbursement(parsed.data, req.user.id);
    res.status(201).json({ data: payment, message: 'Disbursement recorded successfully' });
  },

  async getDisbursements(req: Request, res: Response) {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const result = await financeService.getDisbursements({
      page,
      limit,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      smsStatus: typeof req.query.smsStatus === 'string' ? req.query.smsStatus : undefined,
      minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
      maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
      fromDate: typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined,
      toDate: typeof req.query.toDate === 'string' ? req.query.toDate : undefined,
    });
    res.json(result);
  },

  async getDisbursementById(req: Request, res: Response) {
    const id = String(req.params.id);
    const data = await financeService.getDisbursementById(id);
    res.json({ data });
  },

  async getContractsLookup(req: Request, res: Response) {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const contracts = await financeService.getContractsLookup(search);
    res.json({ data: contracts });
  },

  async retrySms(req: Request, res: Response) {
    const id = String(req.params.id);
    const result = await financeService.retrySms(id);
    res.json(result);
  },

  async getSmsSettings(req: Request, res: Response) {
    const settings = await financeService.getSmsSettings();
    // Mask API key
    res.json({ data: { ...settings, gatewayApiKey: settings.gatewayApiKey ? '***' : '' } });
  },

  async updateSmsSettings(req: Request, res: Response) {
    const parsed = SmsSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw ApiError.badRequest('Validation failed', fieldErrors);
    }
    await financeService.updateSmsSettings(parsed.data);
    res.json({ message: 'SMS settings updated' });
  },

  async testSms(req: Request, res: Response) {
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    if (!phone) throw ApiError.badRequest('Phone number required');
    const result = await financeService.sendTestSms(phone);
    res.json(result);
  },
};
