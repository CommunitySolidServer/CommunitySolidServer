import type { NamedNode } from '@rdfjs/types';
import { DataFactory } from 'n3';
import type { Quad } from 'rdf-js';
import type { ResourceIdentifier } from '../../../http/representation/ResourceIdentifier';
import type { InteractionRoute } from '../../../identity/interaction/routing/InteractionRoute';
import { NOTIFY, RDF } from '../../../util/Vocabularies';
import { DEFAULT_NOTIFICATION_FEATURES, NotificationDescriber } from '../NotificationDescriber';
const { namedNode, quad } = DataFactory;

export interface WebHookStorageDescriberArgs {
  route: InteractionRoute;
  relative: string;
  webIdRoute: InteractionRoute;
  features?: string[];
}

/**
 * Handles the necessary triples for describing a WebHookSubcription2021 notification channel.
 *
 * Extends {@link NotificationDescriber} by adding the necessary `notify:webid` and `notify:webhookAuth` triples.
 */
export class WebHookDescriber extends NotificationDescriber {
  private readonly webId: NamedNode;

  public constructor(args: WebHookStorageDescriberArgs) {
    const features = args.features ?? [ ...DEFAULT_NOTIFICATION_FEATURES ];
    features.push(NOTIFY.webhookAuth);
    super(args.route, args.relative, NOTIFY.WebHookSubscription2021, features);

    this.webId = namedNode(args.webIdRoute.getPath());
  }

  public async handle(input: ResourceIdentifier): Promise<Quad[]> {
    const quads = await super.handle(input);

    // Find the notification channel subject
    const typeQuad = quads.find((entry): boolean => entry.predicate.equals(RDF.terms.type) &&
      entry.object.equals(NOTIFY.terms.WebHookSubscription2021));
    quads.push(quad(typeQuad!.subject, NOTIFY.terms.webid, this.webId));

    return quads;
  }
}
