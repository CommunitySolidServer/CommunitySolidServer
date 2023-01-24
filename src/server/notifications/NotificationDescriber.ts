import type { NamedNode, Quad } from '@rdfjs/types';
import { DataFactory } from 'n3';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { InteractionRoute } from '../../identity/interaction/routing/InteractionRoute';
import { NOTIFY } from '../../util/Vocabularies';
import { StorageDescriber } from '../description/StorageDescriber';
const { namedNode, quad } = DataFactory;

export const DEFAULT_NOTIFICATION_FEATURES = [
  NOTIFY.accept,
  NOTIFY.endAt,
  NOTIFY.rate,
  NOTIFY.startAt,
  NOTIFY.state,
];

/**
 * Outputs quads describing a Notification Subscription Service,
 * as described in https://solidproject.org/TR/2022/notifications-protocol-20221231#discovery and
 * https://solidproject.org/TR/2022/notifications-protocol-20221231#description-resource-data-model.
 */
export class NotificationDescriber extends StorageDescriber {
  private readonly path: NamedNode;
  private readonly type: NamedNode;
  private readonly features: NamedNode[];

  /**
   * @param route - The route describing where the subscription target is.
   * @param type - The rdf:type of the subscription type.
   * @param features - Which features are enabled for this subscription type. Defaults to accept/expiration/rate/state.
   */
  public constructor(route: InteractionRoute, type: string,
    features: string[] = DEFAULT_NOTIFICATION_FEATURES) {
    super();
    this.path = namedNode(route.getPath());
    this.type = namedNode(type);
    this.features = features.map(namedNode);
  }

  public async handle(input: ResourceIdentifier): Promise<Quad[]> {
    const subject = namedNode(input.path);

    return [
      quad(subject, NOTIFY.terms.subscription, this.path),
      quad(this.path, NOTIFY.terms.channelType, this.type),
      ...this.features.map((feature): Quad => quad(this.path, NOTIFY.terms.feature, feature)),
    ];
  }
}
