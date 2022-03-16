import type {
  EmailSenderArgs,
} from '../../../../../../src/identity/interaction/password/util/BaseEmailSender';
import {
  BaseEmailSender,
} from '../../../../../../src/identity/interaction/password/util/BaseEmailSender';
import type { EmailArgs } from '../../../../../../src/identity/interaction/password/util/EmailSender';

jest.mock('nodemailer');

describe('A BaseEmailSender', (): void => {
  let constructorArgs: EmailSenderArgs;
  const recipient = 'test@test.com';
  const args: EmailArgs = { recipient, subject: 'subject!', text: 'text!', html: '<html><body></body></html>' };
  let sendMail: jest.Mock;

  beforeEach(async(): Promise<void> => {
    constructorArgs = {
      emailConfig: {
        host: 'smtp.example.email',
        port: 587,
        auth: {
          user: 'alice@example.email',
          pass: 'NYEaCsqV7aVStRCbmC',
        },
      },
    };

    sendMail = jest.fn();
    const nodemailer = jest.requireMock('nodemailer');
    Object.assign(nodemailer, { createTransport: (): any => ({ sendMail }) });
  });

  it('sends a mail with the given settings.', async(): Promise<void> => {
    constructorArgs.senderName = 'My Solid Server';
    const sender = new BaseEmailSender(constructorArgs);
    await expect(sender.handleSafe(args)).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenLastCalledWith({
      from: 'My Solid Server',
      to: recipient,
      subject: args.subject,
      text: args.text,
      html: args.html,
    });
  });

  it('defaults to the name Solid if none is provided.', async(): Promise<void> => {
    const sender = new BaseEmailSender(constructorArgs);
    await expect(sender.handleSafe(args)).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenLastCalledWith({
      from: 'Solid',
      to: recipient,
      subject: args.subject,
      text: args.text,
      html: args.html,
    });
  });
});
