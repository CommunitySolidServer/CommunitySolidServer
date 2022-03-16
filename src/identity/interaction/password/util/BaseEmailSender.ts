import { createTransport } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { EmailSender } from './EmailSender';
import type { EmailArgs } from './EmailSender';

export interface EmailSenderArgs {
  emailConfig: {
    host: string;
    port: number;
    auth: {
      user: string;
      pass: string;
    };
  };
  senderName?: string;
}

/**
 * Sends e-mails using nodemailer.
 */
export class BaseEmailSender extends EmailSender {
  private readonly logger = getLoggerFor(this);

  private readonly mailTransporter: Mail;
  private readonly senderName: string;

  public constructor(args: EmailSenderArgs) {
    super();
    this.mailTransporter = createTransport(args.emailConfig);
    this.senderName = args.senderName ?? 'Solid';
  }

  public async handle({ recipient, subject, text, html }: EmailArgs): Promise<void> {
    await this.mailTransporter.sendMail({
      from: this.senderName,
      to: recipient,
      subject,
      text,
      html,
    });
    this.logger.debug(`Sending recovery mail to ${recipient}`);
  }
}
