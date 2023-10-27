import { RdfValidator } from '../../../../src/http/auxiliary/RdfValidator';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { RepresentationConverter } from '../../../../src/storage/conversion/RepresentationConverter';
import { readableToString } from '../../../../src/util/StreamUtil';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';
import 'jest-rdf';

describe('An RdfValidator', (): void => {
  let converter: RepresentationConverter;
  let validator: RdfValidator;
  const identifier: ResourceIdentifier = { path: 'any/path' };

  beforeEach(async(): Promise<void> => {
    converter = new StaticAsyncHandler<any>(true, null);
    validator = new RdfValidator(converter);
  });

  it('can handle all representations.', async(): Promise<void> => {
    await expect(validator.canHandle(null as any)).resolves.toBeUndefined();
  });

  it('always accepts content-type internal/quads.', async(): Promise<void> => {
    const representation = new BasicRepresentation('data', 'internal/quads');
    await expect(validator.handle({ representation, identifier })).resolves.toEqual(representation);
  });

  it('validates data by running it through a converter.', async(): Promise<void> => {
    jest.spyOn(converter, 'handleSafe').mockResolvedValue(new BasicRepresentation('transformedData', 'wrong/type'));
    const representation = new BasicRepresentation('data', 'content/type');
    const quads = representation.metadata.quads();
    // Output is not important for this Validator
    await expect(validator.handle({ representation, identifier })).resolves.toBeDefined();
    // Make sure the data can still be streamed
    await expect(readableToString(representation.data)).resolves.toBe('data');
    // Make sure the metadata was not changed
    expect(quads).toBeRdfIsomorphic(representation.metadata.quads());
  });

  it('throws an error when validating invalid data.', async(): Promise<void> => {
    jest.spyOn(converter, 'handleSafe').mockRejectedValue(new Error('bad data!'));
    const representation = new BasicRepresentation('data', 'content/type');
    await expect(validator.handle({ representation, identifier })).rejects.toThrow('bad data!');
    // Make sure the data on the readable has not been reset
    expect(representation.data.destroyed).toBe(true);
  });
});
