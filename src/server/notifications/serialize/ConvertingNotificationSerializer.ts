import type { Representation } from '../../../http/representation/Representation';
import type { RepresentationPreferences } from '../../../http/representation/RepresentationPreferences';
import type { RepresentationConverter } from '../../../storage/conversion/RepresentationConverter';
import type { NotificationSerializerInput } from './NotificationSerializer';
import { NotificationSerializer } from './NotificationSerializer';

/**
 * Converts a serialization based on the provided `accept` feature value.
 * In case none was provided no conversion takes place.
 */
export class ConvertingNotificationSerializer extends NotificationSerializer {
  private readonly source: NotificationSerializer;
  private readonly converter: RepresentationConverter;

  public constructor(source: NotificationSerializer, converter: RepresentationConverter) {
    super();
    this.source = source;
    this.converter = converter;
  }

  public async canHandle(input: NotificationSerializerInput): Promise<void> {
    await this.source.canHandle(input);
  }

  public async handle(input: NotificationSerializerInput): Promise<Representation> {
    const representation = await this.source.handle(input);

    const type = input.channel.accept;

    if (!type) {
      return representation;
    }

    const preferences: RepresentationPreferences = { type: { [type]: 1 }};
    return this.converter.handleSafe({ representation, preferences, identifier: { path: input.notification.id }});
  }
}
