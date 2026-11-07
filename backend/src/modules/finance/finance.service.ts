import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { ApiError } from '../../utils/errors.js';
import type { DisbursementInput, SmsSettingsInput } from './finance.schema.js';

const SMS_THRESHOLD_DEFAULT = 20_000_000;

// ─── Settings helpers ──────────────────────────────────────────────────────────

async function getSetting(key: string, defaultVal = ''): Promise<string> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? defaultVal;
}

async function setSetting(key: string, value: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getSmsSettings() {
  const [enabled, gatewayUrl, gatewayApiKey, threshold, recipientsJson, mockMode] =
    await Promise.all([
      getSetting('sms_enabled', 'false'),
      getSetting('sms_gateway_url', ''),
      getSetting('sms_gateway_api_key', ''),
      getSetting('sms_threshold_etb', String(SMS_THRESHOLD_DEFAULT)),
      getSetting('sms_recipients', '[]'),
      getSetting('sms_mock_mode', 'true'),
    ]);

  let recipients: { name: string; phone: string }[] = [];
  try {
    recipients = JSON.parse(recipientsJson);
  } catch {
    recipients = [];
  }

  return {
    smsEnabled: enabled === 'true',
    gatewayUrl,
    gatewayApiKey,
    thresholdEtb: parseInt(threshold, 10) || SMS_THRESHOLD_DEFAULT,
    recipients,
    mockMode: mockMode === 'true',
  };
}

export async function updateSmsSettings(data: SmsSettingsInput): Promise<void> {
  await Promise.all([
    setSetting('sms_enabled', data.smsEnabled ? 'true' : 'false'),
    setSetting('sms_gateway_url', data.gatewayUrl),
    setSetting('sms_gateway_api_key', data.gatewayApiKey),
    setSetting('sms_threshold_etb', String(data.thresholdEtb)),
    setSetting('sms_recipients', JSON.stringify(data.recipients)),
    setSetting('sms_mock_mode', (data.mockMode ?? false) ? 'true' : 'false'),
  ]);
}

// ─── SMS dispatch ──────────────────────────────────────────────────────────────

async function formatSmsMessage(
  amount: number,
  payeeName: string,
  referenceNo: string,
  category: string,
): Promise<string> {
  const amountFormatted = new Intl.NumberFormat('en-US').format(amount);
  const categoryLabels: Record<string, string> = {
    PROCUREMENT_GOODS: 'Procurement/Goods',
    CONTRACTOR_WORKS: 'Contractor/Works',
    PROJECT_GRANT: 'Project/Grant',
    OPERATIONAL_ADMIN: 'Operational/Admin',
    OTHER_GENERAL: 'General Ministry',
  };
  const catLabel = categoryLabels[category] || category;
  return `[MoA Alert] High-Value Disbursement: ETB ${amountFormatted} paid to ${payeeName} (${catLabel}). Ref: ${referenceNo}. Approve via Finance Portal.`;
}

async function sendSmsToGateway(
  phone: string,
  message: string,
  gatewayUrl: string,
  apiKey: string,
): Promise<{ success: boolean; response: string }> {
  try {
    const res = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ to: phone, message }),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    if (!res.ok) {
      return { success: false, response: text };
    }
    return { success: true, response: text };
  } catch (err: unknown) {
    return { success: false, response: String(err) };
  }
}

export async function dispatchSms(paymentId: string): Promise<void> {
  try {
    const settings = await getSmsSettings();
    if (!settings.smsEnabled) {
      logger.info({ paymentId }, 'SMS disabled, skipping dispatch');
      return;
    }
    if (!settings.recipients.length) {
      logger.warn({ paymentId }, 'No SMS recipients configured');
      return;
    }

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;

    const message = await formatSmsMessage(
      Number(payment.amount),
      payment.payeeName || 'Unknown Payee',
      payment.referenceNo,
      payment.category || 'OTHER_GENERAL',
    );

    const statuses: string[] = [];

    for (const recipient of settings.recipients) {
      let status = 'PENDING';
      let gatewayResponse: string | null = null;
      let errorMessage: string | null = null;

      if (settings.mockMode) {
        // Console/mock mode — log but don't call gateway
        logger.info(
          { paymentId, phone: recipient.phone, message },
          '[MOCK] SMS would be sent',
        );
        status = 'SENT';
        gatewayResponse = 'mock_mode';
      } else if (settings.gatewayUrl) {
        const result = await sendSmsToGateway(
          recipient.phone,
          message,
          settings.gatewayUrl,
          settings.gatewayApiKey,
        );
        status = result.success ? 'SENT' : 'FAILED';
        gatewayResponse = result.response.substring(0, 500);
        if (!result.success) errorMessage = result.response.substring(0, 500);
      } else {
        status = 'FAILED';
        errorMessage = 'Gateway URL not configured';
      }

      await prisma.smsLog.create({
        data: {
          paymentId,
          recipientPhone: recipient.phone,
          recipientName: recipient.name,
          message,
          status,
          gatewayResponse,
          errorMessage,
          sentAt: new Date(),
        },
      });

      statuses.push(status);
    }

    const allSent = statuses.every((s) => s === 'SENT');
    const allFailed = statuses.every((s) => s === 'FAILED');
    const overallStatus = allSent ? 'SENT' : allFailed ? 'FAILED' : 'PARTIAL';

    await prisma.payment.update({
      where: { id: paymentId },
      data: { smsTriggered: true, smsStatus: overallStatus },
    });
  } catch (err) {
    logger.error({ paymentId, err }, 'SMS dispatch error');
    await prisma.payment.update({
      where: { id: paymentId },
      data: { smsStatus: 'FAILED' },
    }).catch(() => {});
  }
}

// ─── Disbursements ─────────────────────────────────────────────────────────────

export async function createDisbursement(data: DisbursementInput, userId: string) {
  const settings = await getSmsSettings();
  const threshold = settings.thresholdEtb;
  const willTriggerSms = settings.smsEnabled && data.amount >= threshold;

  const payment = await prisma.payment.create({
    data: {
      referenceNo: data.referenceNo,
      payeeName: data.payeeName,
      amount: data.amount,
      category: data.category,
      paymentMethod: data.paymentMethod,
      paymentDate: new Date(data.paymentDate),
      remarks: data.remarks ?? null,
      contractId: data.contractId || null,
      createdById: userId,
      status: 'PAID',
      smsTriggered: false,
      smsStatus: willTriggerSms ? 'PENDING' : null,
    },
  });

  // Fire-and-forget SMS dispatch if threshold met
  if (willTriggerSms) {
    setImmediate(() => dispatchSms(payment.id));
  }

  return payment;
}

export async function getDisbursements(params: {
  page: number;
  limit: number;
  search?: string | undefined;
  category?: string | undefined;
  smsStatus?: string | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
}) {
  const { page, limit, search, category, smsStatus, fromDate, toDate } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { referenceNo: { contains: search, mode: 'insensitive' } },
      { payeeName: { contains: search, mode: 'insensitive' } },
      { remarks: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;
  if (smsStatus) where.smsStatus = smsStatus;
  if (fromDate || toDate) {
    where.paymentDate = {
      ...(fromDate ? { gte: new Date(fromDate) } : {}),
      ...(toDate ? { lte: new Date(toDate) } : {}),
    };
  }

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        creator: { select: { id: true, displayName: true, email: true } },
        contract: { select: { id: true, contractNo: true } },
        smsLogs: { orderBy: { sentAt: 'desc' }, take: 10 },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getDisbursementById(id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, displayName: true, email: true } },
      contract: { select: { id: true, contractNo: true, supplier: true } },
      smsLogs: { orderBy: { sentAt: 'desc' } },
    },
  });
  if (!payment) throw ApiError.notFound('Disbursement not found');
  return payment;
}

export async function retrySms(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw ApiError.notFound('Disbursement not found');

  // Reset status and dispatch
  await prisma.payment.update({
    where: { id: paymentId },
    data: { smsStatus: 'PENDING' },
  });
  await dispatchSms(paymentId);

  return { message: 'SMS retry initiated' };
}

export async function sendTestSms(phone: string) {
  const settings = await getSmsSettings();
  if (settings.mockMode) {
    logger.info({ phone }, '[MOCK] Test SMS sent');
    return { success: true, message: 'Mock mode: SMS logged to console' };
  }
  if (!settings.gatewayUrl) {
    throw ApiError.badRequest('Gateway URL not configured');
  }
  const result = await sendSmsToGateway(
    phone,
    '[MoA Test] SMS gateway connectivity check from Procurement System.',
    settings.gatewayUrl,
    settings.gatewayApiKey,
  );
  return { success: result.success, message: result.response };
}
