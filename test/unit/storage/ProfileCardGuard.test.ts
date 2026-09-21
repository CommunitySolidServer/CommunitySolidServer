import type { Quad } from '@rdfjs/types';
import { DataFactory } from 'n3';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { WebIdStore } from '../../../src/identity/interaction/webid/util/WebIdStore';
import { ProfileCardGuard } from '../../../src/storage/ProfileCardGuard';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { INTERNAL_QUADS } from '../../../src/util/ContentTypes';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { guardedStreamFrom, readableToString } from '../../../src/util/StreamUtil';
import { SOLID } from '../../../src/util/Vocabularies';

const { namedNode, quad } = DataFactory;

const CARD: ResourceIdentifier = { path: 'http://example.com/alice/profile/card' };
const OTHER: ResourceIdentifier = { path: 'http://example.com/alice/notes' };
const WEBID = 'http://example.com/alice/profile/card#me';
const ISSUER = 'http://example.com/';
const WEB_ID_PATHS = [ '/profile/card#me' ];

function representation(data: any, contentType: string, identifier?: string): Representation {
  const metadata = identifier ? new RepresentationMetadata({ path: identifier }) : new RepresentationMetadata();
  metadata.contentType = contentType;
  return new BasicRepresentation(data, metadata);
}

function quadRepresentation(quads: Quad[]): Representation {
  return representation(guardedStreamFrom(quads), INTERNAL_QUADS);
}

function issuerQuad(webId = WEBID, issuer = ISSUER): Quad {
  return quad(namedNode(webId), namedNode(SOLID.terms.oidcIssuer.value), namedNode(issuer));
}

describe('A ProfileCardGuard', (): void => {
  const source: jest.Mocked<ResourceStore> = {
    getRepresentation: jest.fn(async(): Promise<any> => 'get'),
    addResource: jest.fn(async(): Promise<any> => 'add'),
    setRepresentation: jest.fn(async(): Promise<any> => 'set'),
    deleteResource: jest.fn(async(): Promise<any> => 'delete'),
    modifyResource: jest.fn(),
  } as any;
  const converter: { handleSafe: jest.Mock } = { handleSafe: jest.fn() };
  let registered: string[];
  let webIdStore: jest.Mocked<WebIdStore>;
  let guard: ProfileCardGuard;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    registered = [ WEBID ];
    webIdStore = {
      hasWebId: jest.fn(async(webId: string): Promise<boolean> => registered.includes(webId)),
    } as any;
    converter.handleSafe.mockResolvedValue(quadRepresentation([ issuerQuad() ]));
    guard = new ProfileCardGuard(source, webIdStore, ISSUER, converter as any, WEB_ID_PATHS);
  });

  it('passes through writes to documents outside the configured card locations.', async(): Promise<void> => {
    const rep = representation('data', 'text/plain');
    await guard.setRepresentation(OTHER, rep);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith(OTHER, rep, undefined);
    expect(webIdStore.hasWebId).toHaveBeenCalledTimes(0);
    expect(converter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('passes through writes to a card location that hosts no registered WebID.', async(): Promise<void> => {
    registered = [];
    const rep = representation('anything', 'text/plain');
    await guard.setRepresentation(CARD, rep);
    expect(webIdStore.hasWebId).toHaveBeenCalledTimes(1);
    expect(webIdStore.hasWebId).toHaveBeenLastCalledWith(WEBID);
    expect(converter.handleSafe).toHaveBeenCalledTimes(0);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
  });

  it('passes through a valid card write that keeps the issuer triple.', async(): Promise<void> => {
    const turtle = '<http://example.com/alice/profile/card#me> solid:oidcIssuer <http://example.com/>.';
    const rep = representation(turtle, 'text/turtle');
    await guard.setRepresentation(CARD, rep);
    expect(converter.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith(CARD, rep, undefined);
    // The original data is still streamable
    await expect(readableToString(rep.data)).resolves.toContain('solid:oidcIssuer');
  });

  it('does not require the card to be sent as Turtle.', async(): Promise<void> => {
    const rep = representation('{ "@id": "http://example.com/alice/profile/card#me" }', 'application/ld+json');
    await guard.setRepresentation(CARD, rep);
    expect(converter.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
  });

  it('accepts a card write provided as internal quads, as produced by a PATCH.', async(): Promise<void> => {
    const rep = representation(guardedStreamFrom([ issuerQuad() ]), INTERNAL_QUADS);
    await guard.setRepresentation(CARD, rep);
    expect(converter.handleSafe).toHaveBeenCalledTimes(0);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith(CARD, rep, undefined);
  });

  it('rejects a card write without the issuer triple.', async(): Promise<void> => {
    converter.handleSafe.mockResolvedValueOnce(quadRepresentation([
      quad(namedNode(WEBID), namedNode('http://purl.org/dc/terms/name'), namedNode('Alice')),
    ]));
    const rep = representation('data', 'text/turtle');
    await expect(guard.setRepresentation(CARD, rep)).rejects.toThrow(BadRequestHttpError);
    expect(source.setRepresentation).toHaveBeenCalledTimes(0);
    expect(rep.data.destroyed).toBe(true);
  });

  it('rejects a card write pointing to another issuer.', async(): Promise<void> => {
    converter.handleSafe.mockResolvedValueOnce(quadRepresentation([ issuerQuad(WEBID, 'http://other.example/') ]));
    const rep = representation('data', 'text/turtle');
    await expect(guard.setRepresentation(CARD, rep)).rejects.toThrow(BadRequestHttpError);
    expect(source.setRepresentation).toHaveBeenCalledTimes(0);
    expect(rep.data.destroyed).toBe(true);
  });

  it('rejects a card write that is not valid RDF.', async(): Promise<void> => {
    converter.handleSafe.mockRejectedValueOnce(new Error('could not parse'));
    const rep = representation('not valid', 'text/turtle');
    await expect(guard.setRepresentation(CARD, rep)).rejects.toThrow(BadRequestHttpError);
    expect(source.setRepresentation).toHaveBeenCalledTimes(0);
    expect(rep.data.destroyed).toBe(true);
  });

  it('rejects a card write when the conversion result is not quads.', async(): Promise<void> => {
    converter.handleSafe.mockResolvedValueOnce(representation('not quads', 'text/turtle'));
    const rep = representation('data', 'text/turtle');
    await expect(guard.setRepresentation(CARD, rep)).rejects.toThrow(BadRequestHttpError);
    expect(source.setRepresentation).toHaveBeenCalledTimes(0);
    expect(rep.data.destroyed).toBe(true);
  });

  it('protects cards at any pod root, as the path only has to match the suffix.', async(): Promise<void> => {
    const rootCard: ResourceIdentifier = { path: 'http://example.com/profile/card' };
    const rootWebId = 'http://example.com/profile/card#me';
    registered = [ rootWebId ];
    converter.handleSafe.mockResolvedValue(quadRepresentation([ issuerQuad(rootWebId) ]));
    const rep = representation('data', 'text/turtle');
    await guard.setRepresentation(rootCard, rep);
    expect(webIdStore.hasWebId).toHaveBeenLastCalledWith(rootWebId);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
  });

  it('supports multiple configured WebID locations, e.g. after a config change.', async(): Promise<void> => {
    const oldCard: ResourceIdentifier = { path: 'http://example.com/alice/old/location' };
    const oldWebId = 'http://example.com/alice/old/location#this';
    registered = [ WEBID, oldWebId ];
    guard = new ProfileCardGuard(
      source,
      webIdStore,
      ISSUER,
      converter as any,
      [ '/profile/card#me', '/old/location#this' ],
    );

    converter.handleSafe.mockResolvedValue(quadRepresentation([ issuerQuad(oldWebId) ]));
    await guard.setRepresentation(oldCard, representation('data', 'text/turtle'));
    expect(webIdStore.hasWebId).toHaveBeenLastCalledWith(oldWebId);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
  });

  it('requires the issuer triple for every registered WebID on the document.', async(): Promise<void> => {
    const secondWebId = 'http://example.com/alice/profile/card#this';
    registered = [ WEBID, secondWebId ];
    guard = new ProfileCardGuard(
      source,
      webIdStore,
      ISSUER,
      converter as any,
      [ '/profile/card#me', '/profile/card#this' ],
    );

    // Only one of the two WebIDs keeps its issuer triple
    converter.handleSafe.mockResolvedValueOnce(quadRepresentation([ issuerQuad() ]));
    await expect(guard.setRepresentation(CARD, representation('data', 'text/turtle')))
      .rejects.toThrow(BadRequestHttpError);
    expect(source.setRepresentation).toHaveBeenCalledTimes(0);

    // Both WebIDs keep their issuer triple
    converter.handleSafe.mockResolvedValueOnce(quadRepresentation([
      issuerQuad(),
      issuerQuad(secondWebId),
    ]));
    await guard.setRepresentation(CARD, representation('data', 'text/turtle'));
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
  });

  it('validates a card created through addResource when its URL is known.', async(): Promise<void> => {
    const rep = representation('data', 'text/turtle', CARD.path);
    await guard.addResource({ path: 'http://example.com/alice/' }, rep);
    expect(webIdStore.hasWebId).toHaveBeenLastCalledWith(WEBID);
    expect(converter.handleSafe).toHaveBeenCalledTimes(1);
    expect(source.addResource).toHaveBeenCalledTimes(1);
  });

  it('does not validate addResource calls without a known URL.', async(): Promise<void> => {
    const rep = representation('data', 'text/plain');
    await guard.addResource({ path: 'http://example.com/alice/' }, rep);
    // The metadata only contains a generated blank-node identifier, so nothing is validated
    expect(converter.handleSafe).toHaveBeenCalledTimes(0);
    expect(source.addResource).toHaveBeenCalledTimes(1);
  });

  it('supports configured WebID paths without a fragment.', async(): Promise<void> => {
    const plainCard: ResourceIdentifier = { path: 'http://example.com/alice/plain' };
    const plainWebId = 'http://example.com/alice/plain';
    registered = [ plainWebId ];
    guard = new ProfileCardGuard(
      source,
      webIdStore,
      ISSUER,
      converter as any,
      [ '/plain' ],
    );
    converter.handleSafe.mockResolvedValue(quadRepresentation([ issuerQuad(plainWebId) ]));
    await guard.setRepresentation(plainCard, representation('data', 'text/turtle'));
    expect(webIdStore.hasWebId).toHaveBeenLastCalledWith(plainWebId);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
  });

  it('forbids deleting the card of a registered WebID.', async(): Promise<void> => {
    await expect(guard.deleteResource(CARD)).rejects.toThrow(ForbiddenHttpError);
    expect(webIdStore.hasWebId).toHaveBeenLastCalledWith(WEBID);
    expect(source.deleteResource).toHaveBeenCalledTimes(0);
  });

  it('allows deleting documents that host no registered WebID.', async(): Promise<void> => {
    registered = [];
    await guard.deleteResource(CARD);
    expect(source.deleteResource).toHaveBeenCalledTimes(1);

    await guard.deleteResource(OTHER);
    expect(source.deleteResource).toHaveBeenCalledTimes(2);
  });
});
