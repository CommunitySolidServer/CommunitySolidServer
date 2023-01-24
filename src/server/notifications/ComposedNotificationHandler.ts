import type { NotificationGenerator } from './generate/NotificationGenerator';
import type { NotificationEmitter } from './NotificationEmitter';
import type { NotificationHandlerInput } from './NotificationHandler';
import { NotificationHandler } from './NotificationHandler';
import type { NotificationSerializer } from './serialize/NotificationSerializer';

export interface ComposedNotificationHandlerArgs {
  generator: NotificationGenerator;
  serializer: NotificationSerializer;
  emitter: NotificationEmitter;
}

/**
 * Generates, serializes and emits a {@link Notification} using a {@link NotificationGenerator},
 * {@link NotificationSerializer} and {@link NotificationEmitter}.
 *
 * Will not emit an event in case it has the same state as the notification channel info.
 */
export class ComposedNotificationHandler extends NotificationHandler {
  private readonly generator: NotificationGenerator;
  private readonly serializer: NotificationSerializer;
  private readonly emitter: NotificationEmitter;

  public constructor(args: ComposedNotificationHandlerArgs) {
    super();
    this.generator = args.generator;
    this.serializer = args.serializer;
    this.emitter = args.emitter;
  }

  public async canHandle(input: NotificationHandlerInput): Promise<void> {
    await this.generator.canHandle(input);
  }

  public async handle(input: NotificationHandlerInput): Promise<void> {
    const notification = await this.generator.handle(input);

    const { state } = input.info;
    // In case the state matches there is no need to send the notification
    if (typeof state === 'string' && state === notification.state) {
      return;
    }

    const representation = await this.serializer.handleSafe({ info: input.info, notification });
    await this.emitter.handleSafe({ info: input.info, representation });
  }
}
