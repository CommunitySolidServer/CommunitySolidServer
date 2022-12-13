import 'jest-rdf';
import { DataFactory } from 'n3';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import { WebHookDescriber } from '../../../../../src/server/notifications/WebHookSubscription2021/WebHookDescriber';
import { NOTIFY, RDF } from '../../../../../src/util/Vocabularies';
const { namedNode, quad } = DataFactory;

describe('A WebHookDescriber', (): void => {
  const identifier: ResourceIdentifier = { path: 'http://example.com/foo' };
  const route = new AbsolutePathInteractionRoute('http://example.com/.notifications/webhooks/');
  const webIdRoute = new AbsolutePathInteractionRoute('http://example.com/.notifications/webhooks/webId');
  const relative = '#webhookNotification';
  const type = 'http://www.w3.org/ns/solid/notifications#WebHookSubscription2021';
  let describer: WebHookDescriber;

  beforeEach(async(): Promise<void> => {
    describer = new WebHookDescriber({ route, webIdRoute, relative });
  });

  it('outputs the expected quads.', async(): Promise<void> => {
    const subscription = namedNode('http://example.com/foo#webhookNotification');
    const quads = await describer.handle(identifier);
    expect(quads).toBeRdfIsomorphic([
      quad(namedNode(identifier.path), NOTIFY.terms.notificationChannel, subscription),
      quad(subscription, RDF.terms.type, namedNode(type)),
      quad(subscription, NOTIFY.terms.subscription, namedNode('http://example.com/.notifications/webhooks/')),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.accept),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.expiration),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.rate),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.state),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.webhookAuth),
      quad(subscription, NOTIFY.terms.webid, namedNode(webIdRoute.getPath())),
    ]);
  });
});
