import {
  EmailSender,
} from '../../../../../src/identity/interaction/util/EmailSender';

jest.mock('nodemailer');

describe('An EmailSender', (): void => {
  const emailConfig: any = 'emailConfig!';
  const email = 'test@test.com';
  const content: any = { subject: 'subject!', text: 'text!', html: 'html!' };
  let sendMail: jest.Mock;

  beforeEach(async(): Promise<void> => {
    sendMail = jest.fn();
    const nodemailer = jest.requireMock('nodemailer');
    Object.assign(nodemailer, { createTransport: (): any => ({ sendMail }) });
  });

  it('sends a mail with the given settings.', async(): Promise<void> => {
    const sender = new EmailSender({ emailConfig, senderName: 'name!' });
    await expect(sender.sendEmail(email, content)).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenLastCalledWith({
      from: 'name!',
      to: email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  });

  it('defaults to the name Solid if none is provided.', async(): Promise<void> => {
    const sender = new EmailSender({ emailConfig });
    await expect(sender.sendEmail(email, content)).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenLastCalledWith({
      from: 'Solid',
      to: email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  });
});
