import { AsyncHandler } from '../../../../util/handlers/AsyncHandler';

export interface EmailArgs {
  recipient: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * A class that can send an e-mail.
 */
export abstract class EmailSender extends AsyncHandler<EmailArgs> {}
