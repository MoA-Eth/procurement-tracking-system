import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import nodemailer from 'nodemailer';

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function isBrevoConfigured(): boolean {
  return Boolean(
    env.BREVO_API_KEY && env.BREVO_FROM_EMAIL && env.BREVO_FROM_NAME,
  );
}

export function isMailerSendConfigured(): boolean {
  return Boolean(
    env.MAILERSEND_API_TOKEN &&
    env.MAILERSEND_FROM_EMAIL &&
    env.MAILERSEND_FROM_NAME,
  );
}

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export async function sendEmail(message: TransactionalEmail): Promise<void> {
  const cleanTo = message.to.trim().toLowerCase();

  // 1. Try Brevo API first
  if (isBrevoConfigured()) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: {
          email: env.BREVO_FROM_EMAIL,
          name: env.BREVO_FROM_NAME,
        },
        to: [
          {
            email: cleanTo,
          },
        ],
        subject: message.subject,
        textContent: message.text,
        ...(message.html ? { htmlContent: message.html } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Brevo returned HTTP ${response.status}: ${responseText}`,
      );
    }

    logger.info(
      { to: cleanTo, subject: message.subject },
      'Email sent successfully via Brevo',
    );

    return;
  }

  // 2. Try MailerSend REST API
  if (isMailerSendConfigured()) {
    const apiToken = env.MAILERSEND_API_TOKEN;
    const fromEmail = env.MAILERSEND_FROM_EMAIL;
    const fromName = env.MAILERSEND_FROM_NAME;

    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${apiToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: fromName },
        to: [{ email: cleanTo }],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const responseText = (await response.text()).slice(0, 500);

      let providerMessage = responseText;

      try {
        const payload = JSON.parse(responseText) as {
          message?: unknown;
        };

        providerMessage =
          typeof payload.message === 'string' ? payload.message : responseText;
      } catch {
        // Keep the plain-text response.
      }

      throw new Error(
        `MailerSend returned HTTP ${response.status}${
          providerMessage ? `: ${providerMessage}` : ''
        }`,
      );
    }

    logger.info(
      { to: cleanTo, subject: message.subject },
      'Email sent successfully via MailerSend',
    );

    return;
  }

  // 3. Try SMTP / Nodemailer
  if (isSmtpConfigured()) {
    const port = env.SMTP_PORT ?? 587;
    const secure = env.SMTP_SECURE ?? port === 465;
    const fromAddress =
      env.SMTP_FROM || `"MoA Procurement Tracking System" <${env.SMTP_USER}>`;
    const senderEmail = env.SMTP_USER;

    const createTransporter = (targetPort: number, isSecure: boolean) =>
      nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: targetPort,
        secure: isSecure,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS?.replace(/\s+/g, ''),
        },
        connectionTimeout: 15_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
        tls: {
          rejectUnauthorized: false,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    const mailOptions = {
      from: fromAddress,
      to: cleanTo,
      sender: senderEmail,
      replyTo: senderEmail || fromAddress,
      envelope: {
        from: senderEmail || fromAddress,
        to: [cleanTo],
      },
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
      headers: {
        'X-Auto-Response-Suppress': 'All',
        'Auto-Submitted': 'auto-generated',
        'X-Priority': '3',
        Priority: 'Normal',
        Importance: 'Normal',
      },
    };

    try {
      const transporter = createTransporter(port, secure);
      await transporter.sendMail(mailOptions);
      logger.info(
        { to: cleanTo, subject: message.subject, port, secure },
        'Email sent successfully via SMTP',
      );
      return;
    } catch (primaryError) {
      // If primary port (e.g. 465) failed or timed out, attempt alternate standard port (587)
      const fallbackPort = port === 465 ? 587 : 465;
      const fallbackSecure = fallbackPort === 465;
      logger.warn(
        { error: primaryError, primaryPort: port, fallbackPort },
        'Primary SMTP delivery failed, attempting fallback SMTP port',
      );

      try {
        const fallbackTransporter = createTransporter(
          fallbackPort,
          fallbackSecure,
        );
        await fallbackTransporter.sendMail(mailOptions);
        logger.info(
          {
            to: cleanTo,
            subject: message.subject,
            port: fallbackPort,
            secure: fallbackSecure,
          },
          'Email sent successfully via fallback SMTP',
        );
        return;
      } catch (fallbackError) {
        logger.error(
          { error: fallbackError, to: cleanTo, subject: message.subject },
          'Failed to send email via SMTP on both primary and fallback ports',
        );
        throw fallbackError;
      }
    }
  }

  // 4. Fallback to Ethereal for local development
  if (env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"Test MoA Procurement" <test@example.com>',
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });

    logger.info(`Test Email Sent: ${nodemailer.getTestMessageUrl(info)}`);

    return;
  }

  throw new Error('No email provider is configured. Cannot send email.');
}
