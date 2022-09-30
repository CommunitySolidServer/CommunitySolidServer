import type { NamedNode, Quad } from '@rdfjs/types';
import { DataFactory } from 'n3';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { InteractionRoute } from '../../identity/interaction/routing/InteractionRoute';
import { NOTIFY, RDF } from '../../util/Vocabularies';
import { StorageDescriber } from '../description/StorageDescriber';
const { namedNode, quad } = DataFactory;

const DEFAULT_FEATURES = [
  NOTIFY.accept,
  NOTIFY.expiration,
  NOTIFY.rate,
  NOTIFY.state,
];

/**
 * Outputs quads describing how to access a specific Notificaion Subscription type and its features,
 * as described in https://solidproject.org/TR/notifications-protocol#discovery.
 */
export class NotificationDescriber extends StorageDescriber {
  private readonly path: NamedNode;
  private readonly relative: string;
  private readonly type: NamedNode;
  private readonly features: NamedNode[];

  /**
   * @param route - The route describing where the subscription target is.
   * @param relative - Will be appended to the input path to generate a named node corresponding to the description.
   *                   E.g., "#websocketNotification".
   * @param type - The rdf:type of the subscription type.
   * @param features - Which features are enabled for this subscription type. Defaults to accept/expiration/rate/state.
   */
  public constructor(route: InteractionRoute, relative: string, type: string, features: string[] = DEFAULT_FEATURES) {
    super();
    this.path = namedNode(route.getPath());
    this.relative = relative;
    this.type = namedNode(type);
    this.features = features.map(namedNode);
  }

  public async handle(input: ResourceIdentifier): Promise<Quad[]> {
    const subject = namedNode(input.path);
    const subscription = namedNode(`${input.path}${this.relative}`);

    return [
      quad(subject, NOTIFY.terms.notificationChannel, subscription),
      quad(subscription, RDF.terms.type, this.type),
      quad(subscription, NOTIFY.terms.subscription, this.path),
      ...this.features.map((feature): Quad => quad(subscription, NOTIFY.terms.feature, feature)),
    ];
  }
}
