import type { ETagHandler } from '../../storage/conditions/ETagHandler';
import type { NotificationGenerator } from './generate/NotificationGenerator';
import type { NotificationEmitter } from './NotificationEmitter';
import type { NotificationHandlerInput } from './NotificationHandler';
import { NotificationHandler } from './NotificationHandler';
import type { NotificationSerializer } from './serialize/NotificationSerializer';

export interface ComposedNotificationHandlerArgs {
  generator: NotificationGenerator;
  serializer: NotificationSerializer;
  emitter: NotificationEmitter;
  eTagHandler: ETagHandler;
}

/**
 * Generates, serializes and emits a {@link Notification} using a {@link NotificationGenerator},
 * {@link NotificationSerializer} and {@link NotificationEmitter}.
 *
 * Will not emit an event when it has the same state as the notification channel.
 */
export class ComposedNotificationHandler extends NotificationHandler {
  private readonly generator: NotificationGenerator;
  private readonly serializer: NotificationSerializer;
  private readonly emitter: NotificationEmitter;
  private readonly eTagHandler: ETagHandler;

  public constructor(args: ComposedNotificationHandlerArgs) {
    super();
    this.generator = args.generator;
    this.serializer = args.serializer;
    this.emitter = args.emitter;
    this.eTagHandler = args.eTagHandler;
  }

  public async canHandle(input: NotificationHandlerInput): Promise<void> {
    await this.generator.canHandle(input);
  }

  public async handle(input: NotificationHandlerInput): Promise<void> {
    const notification = await this.generator.handle(input);

    const { state } = input.channel;
    // In case the state matches there is no need to send the notification
    if (typeof state === 'string' && notification.state &&
      this.eTagHandler.sameResourceState(state, notification.state)) {
      return;
    }

    const representation = await this.serializer.handleSafe({ channel: input.channel, notification });
    await this.emitter.handleSafe({ channel: input.channel, representation });
  }
}
