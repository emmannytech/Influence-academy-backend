import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromAddress: string;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.fromAddress =
      this.config.get<string>('RESEND_FROM_ADDRESS') ||
      'Influence Academy <noreply@influenceacademy.com>';
  }

  async send(input: SendEmailInput, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { data, error } = await this.resend.emails.send({
          from: this.fromAddress,
          to: input.to,
          subject: input.subject,
          html: input.html,
        });

        if (error) {
          this.logger.error(
            `Failed to send email to ${input.to}: ${error.message}`,
          );
          if (attempt < retries) continue;
          return { success: false, error: error.message };
        }

        this.logger.log(`Email sent to ${input.to}, id: ${data?.id}`);
        return { success: true, id: data?.id };
      } catch (err) {
        this.logger.error(
          `Email delivery error to ${input.to} (attempt ${attempt + 1}/${retries + 1}): ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
        if (attempt < retries) continue;
        return { success: false, error: 'Delivery failed' };
      }
    }
    return { success: false, error: 'Delivery failed' };
  }
}
