import type { Quad } from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { APPLICATION_LD_JSON, INTERNAL_QUADS } from '../../util/ContentTypes';
import { NOTIFY } from '../../util/Vocabularies';
import { StorageDescriber } from '../description/StorageDescriber';
import type { NotificationChannelType } from './NotificationChannelType';

const { namedNode, quad } = DataFactory;

/**
 * Outputs quads describing all the subscription services of the server,
 * as described in https://solidproject.org/TR/2022/notifications-protocol-20221231#discovery and
 * https://solidproject.org/TR/2022/notifications-protocol-20221231#description-resource-data-model.
 *
 * In the future, if there is ever a need to add notification channels to the description resource as described above,
 * this functionality should probably be added here as well.
 */
export class NotificationDescriber extends StorageDescriber {
  private readonly converter: RepresentationConverter;
  private readonly subscriptions: NotificationChannelType[];

  public constructor(converter: RepresentationConverter, subscriptions: NotificationChannelType[]) {
    super();
    this.converter = converter;
    this.subscriptions = subscriptions;
  }

  public async handle(identifier: ResourceIdentifier): Promise<Quad[]> {
    const subject = namedNode(identifier.path);

    const subscriptionLinks: Quad[] = [];
    const preferences = { type: { [INTERNAL_QUADS]: 1 }};
    const subscriptionQuads = await Promise.all(this.subscriptions.map(async(sub): Promise<Quad[]> => {
      const jsonld = sub.getDescription();
      const representation = new BasicRepresentation(JSON.stringify(jsonld), { path: jsonld.id }, APPLICATION_LD_JSON);
      const converted = await this.converter.handleSafe({ identifier, representation, preferences });
      const arr = await arrayifyStream<Quad>(converted.data);
      subscriptionLinks.push(quad(subject, NOTIFY.terms.subscription, namedNode(jsonld.id)));
      return arr;
    }));

    return [
      ...subscriptionLinks,
      ...subscriptionQuads.flat(),
    ];
  }
}
