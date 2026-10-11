import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';

const router = Router();

/**
 * Zero-Cost Notification Engine - Email Dispatch
 * POST /api/notifications/email
 */
router.post('/email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, subject, text, html } = req.body;

    // 1. Validate required fields
    if (!to || !subject) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required notification fields: "to" and "subject" are required',
      });
      return;
    }

    // 2. Configure Nodemailer transporter (Gmail / standard SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });

    const fromAddress = process.env.SMTP_USER || 'noreply@sanatanibandhan.internal';

    // 3. Dispatch email
    await transporter.sendMail({
      from: `"Sanatani Bandhan" <${fromAddress}>`,
      to,
      subject,
      text: text || '',
      html: html || text || '',
    });

    console.log(`[Notification Engine] Dispatched email to ${to} with subject "${subject}"`);

    // 4. Return success response
    res.status(200).json({
      success: true,
      message: 'Email dispatched successfully',
    });
  } catch (error: any) {
    console.error('[Notification Engine] Error dispatching email:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error?.message || 'Failed to dispatch email notification',
    });
  }
});

/**
 * Zero-Cost Notification Engine - Telegram Alert Dispatch
 * POST /api/notifications/telegram
 */
router.post('/telegram', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, chatId } = req.body;

    // 1. Validate required message
    if (!message || (typeof message === 'string' && !message.trim())) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required field: "message" is required',
      });
      return;
    }

    // 2. Retrieve Bot Token
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.warn('[Notification Engine] Telegram Bot Token not configured (TELEGRAM_BOT_TOKEN)');
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Telegram Bot Token not configured',
      });
      return;
    }

    // 3. Determine target chatId
    const targetChatId = chatId || process.env.TELEGRAM_DEFAULT_CHAT_ID;
    if (!targetChatId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Target chatId is missing and no default TELEGRAM_DEFAULT_CHAT_ID configured',
      });
      return;
    }

    // 4. Dispatch alert via Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.description || `Telegram API responded with status ${response.status}`);
    }

    console.log(`[Notification Engine] Dispatched Telegram alert to chat ${targetChatId}`);

    // 5. Return success
    res.status(200).json({
      success: true,
      message: 'Telegram alert dispatched successfully',
    });
  } catch (error: any) {
    console.error('[Notification Engine] Error dispatching Telegram alert:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error?.message || 'Failed to dispatch Telegram alert',
    });
  }
});

export default router;
