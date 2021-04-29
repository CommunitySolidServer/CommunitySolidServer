import { BaseEmailSender } from '../../../../../src/identity/interaction/util/BaseEmailSender';
import type { EmailArgs } from '../../../../../src/identity/interaction/util/EmailSender';
jest.mock('nodemailer');

describe('A BaseEmailSender', (): void => {
  const emailConfig: any = 'emailConfig!';
  const recipient = 'test@test.com';
  const args: EmailArgs = { recipient, subject: 'subject!', text: 'text!', html: 'html!' };
  let sendMail: jest.Mock;

  beforeEach(async(): Promise<void> => {
    sendMail = jest.fn();
    const nodemailer = jest.requireMock('nodemailer');
    Object.assign(nodemailer, { createTransport: (): any => ({ sendMail }) });
  });

  it('sends a mail with the given settings.', async(): Promise<void> => {
    const sender = new BaseEmailSender({ emailConfig, senderName: 'name!' });
    await expect(sender.handleSafe(args)).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenLastCalledWith({
      from: 'name!',
      to: recipient,
      subject: args.subject,
      text: args.text,
      html: args.html,
    });
  });

  it('defaults to the name Solid if none is provided.', async(): Promise<void> => {
    const sender = new BaseEmailSender({ emailConfig });
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
