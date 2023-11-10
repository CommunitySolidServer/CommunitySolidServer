import 'jest-rdf';
import { DataFactory } from 'n3';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { NotificationChannelType } from '../../../../src/server/notifications/NotificationChannelType';
import { NotificationDescriber } from '../../../../src/server/notifications/NotificationDescriber';
import type {
  RepresentationConverter,
  RepresentationConverterArgs,
} from '../../../../src/storage/conversion/RepresentationConverter';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { readableToString } from '../../../../src/util/StreamUtil';
import { NOTIFY } from '../../../../src/util/Vocabularies';

const { namedNode, quad } = DataFactory;

describe('A NotificationDescriber', (): void => {
  const identifier: ResourceIdentifier = { path: 'http://example.com/solid/' };
  const jsonld1 = { id: 'http://example.com/.notifications/websockets/' };
  const jsonld2 = { id: 'http://example.com/.notifications/extra/' };
  let converter: jest.Mocked<RepresentationConverter>;
  let subscription1: jest.Mocked<NotificationChannelType>;
  let subscription2: jest.Mocked<NotificationChannelType>;
  let describer: NotificationDescriber;

  beforeEach(async(): Promise<void> => {
    subscription1 = {
      getDescription: jest.fn().mockReturnValue(jsonld1),
    } as any;
    subscription2 = {
      getDescription: jest.fn().mockReturnValue(jsonld2),
    } as any;

    converter = {
      handleSafe: jest.fn(async({ representation }: RepresentationConverterArgs): Promise<Representation> => {
        const jsonld = JSON.parse(await readableToString(representation.data));
        return new BasicRepresentation([
          quad(namedNode(jsonld.id), NOTIFY.terms.feature, NOTIFY.terms.rate),
        ], INTERNAL_QUADS);
      }),
    } as any;

    describer = new NotificationDescriber(converter, [ subscription1, subscription2 ]);
  });

  it('converts the JSON-LD to quads.', async(): Promise<void> => {
    await expect(describer.handle(identifier)).resolves.toBeRdfIsomorphic([
      quad(namedNode(identifier.path), NOTIFY.terms.subscription, namedNode(jsonld1.id)),
      quad(namedNode(identifier.path), NOTIFY.terms.subscription, namedNode(jsonld2.id)),

      quad(namedNode(jsonld1.id), NOTIFY.terms.feature, NOTIFY.terms.rate),

      quad(namedNode(jsonld2.id), NOTIFY.terms.feature, NOTIFY.terms.rate),
    ]);
  });
});
