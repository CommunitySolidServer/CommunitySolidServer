import 'jest-rdf';
import { DataFactory } from 'n3';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import {
  AbsolutePathInteractionRoute,
} from '../../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import { WebHookDescriber } from '../../../../../src/server/notifications/WebHookSubscription2021/WebHookDescriber';
import { NOTIFY } from '../../../../../src/util/Vocabularies';
const { namedNode, quad } = DataFactory;

describe('A WebHookDescriber', (): void => {
  const identifier: ResourceIdentifier = { path: 'http://example.com/foo' };
  const route = new AbsolutePathInteractionRoute('http://example.com/.notifications/webhooks/');
  const webIdRoute = new AbsolutePathInteractionRoute('http://example.com/.notifications/webhooks/webId');
  const type = 'http://www.w3.org/ns/solid/notifications#WebHookSubscription2021';
  let describer: WebHookDescriber;

  beforeEach(async(): Promise<void> => {
    describer = new WebHookDescriber({ route, webIdRoute });
  });

  it('outputs the expected quads.', async(): Promise<void> => {
    const subscription = namedNode('http://example.com/.notifications/webhooks/');
    const quads = await describer.handle(identifier);
    expect(quads).toBeRdfIsomorphic([
      quad(namedNode(identifier.path), NOTIFY.terms.subscription, subscription),
      quad(subscription, NOTIFY.terms.channelType, namedNode(type)),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.accept),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.endAt),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.startAt),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.rate),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.state),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.webhookAuth),
      quad(subscription, NOTIFY.terms.webid, namedNode(webIdRoute.getPath())),
    ]);
  });
});
