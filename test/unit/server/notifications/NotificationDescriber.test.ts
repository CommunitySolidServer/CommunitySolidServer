import 'jest-rdf';
import { DataFactory } from 'n3';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import {
  AbsolutePathInteractionRoute,
} from '../../../../src/identity/interaction/routing/AbsolutePathInteractionRoute';
import { NotificationDescriber } from '../../../../src/server/notifications/NotificationDescriber';
import { NOTIFY, RDF } from '../../../../src/util/Vocabularies';
const { namedNode, quad } = DataFactory;

describe('A NotificationDescriber', (): void => {
  const identifier: ResourceIdentifier = { path: 'http://example.com/foo' };
  const route = new AbsolutePathInteractionRoute('http://example.com/.notifications/websockets/');
  const relative = '#websocketNotification';
  const type = 'http://www.w3.org/ns/solid/notifications#WebSocketSubscription2021';
  let describer: NotificationDescriber;

  beforeEach(async(): Promise<void> => {
    describer = new NotificationDescriber(route, relative, type);
  });

  it('outputs the expected quads.', async(): Promise<void> => {
    const subscription = namedNode('http://example.com/foo#websocketNotification');
    const quads = await describer.handle(identifier);
    expect(quads).toBeRdfIsomorphic([
      quad(namedNode(identifier.path), NOTIFY.terms.notificationChannel, subscription),
      quad(subscription, RDF.terms.type, namedNode(type)),
      quad(subscription, NOTIFY.terms.subscription, namedNode('http://example.com/.notifications/websockets/')),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.accept),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.expiration),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.rate),
      quad(subscription, NOTIFY.terms.feature, NOTIFY.terms.state),
    ]);
  });
});
