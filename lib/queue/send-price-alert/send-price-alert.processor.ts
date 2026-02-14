/**
 * Send Price Alert Email Queue Processor
 * 
 * Purpose: Send price alert emails to individual users
 * Input: User info and price changes
 * Output: Email sent status
 * 
 * Pipeline Flow (Terminal Step):
 * 1. Receive user info and price changes from job data
 * 2. Generate email HTML from template
 * 3. Send email via email service (Resend)
 * 4. Log result
 * 
 * @module lib/queue/send-price-alert
 */

import { Job } from 'bull';
import { Resend } from 'resend';
import { apiLogger } from '@/lib/helpers/api-logger';
import { PriceAlertEmail } from '@/lib/email-templates/PriceAlertEmail';
import type { SendPriceAlertEmailJobData } from './send-price-alert.jobs';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send Price Alert Email Processor
 * 
 * This is a terminal step - no further jobs are emitted
 */
export async function processSendPriceAlertEmailJob(
  job: Job<SendPriceAlertEmailJobData>
): Promise<{
  emailSent: boolean;
  messageId?: string;
  recipientEmail: string;
  priceChangesCount: number;
}> {
  const { userId, email, userName, priceChanges } = job.data;

  apiLogger.info(`[Send Price Alert Processor] Sending email`, {
    jobId: job.id,
    userId,
    email,
    changesCount: priceChanges.length,
  });

  try {
    // Generate unsubscribe URL
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.goodseed.app'}/dashboard/user/settings`;

    // Send email via Resend
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@lembooking.com';
    const { data, error } = await resend.emails.send({
      from: `Goodseed Price Alerts <${fromEmail}>`,
      to: [email],
      subject: `🔥 Price Drop Alert! ${priceChanges.length} Product${priceChanges.length > 1 ? 's' : ''} on Sale`,
      react: PriceAlertEmail({
        userName: userName || 'there',
        priceChanges,
        unsubscribeUrl,
      }),
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }

    apiLogger.info(`[Send Price Alert Processor] Email sent successfully`, {
      jobId: job.id,
      userId,
      email,
      messageId: data?.id,
      productsCount: priceChanges.length,
    });

    return {
      emailSent: true,
      messageId: data?.id,
      recipientEmail: email,
      priceChangesCount: priceChanges.length,
    };

  } catch (error) {
    apiLogger.logError(
      `[Send Price Alert Processor] Failed to send email`,
      error instanceof Error ? error : new Error('Unknown error'),
      {
        jobId: job.id,
        userId,
        email,
      }
    );
    throw error; // Re-throw to trigger Bull retry
  }
}

export default processSendPriceAlertEmailJob;
