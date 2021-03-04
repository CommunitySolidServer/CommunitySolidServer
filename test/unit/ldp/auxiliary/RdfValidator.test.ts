import { RdfValidator } from '../../../../src/ldp/auxiliary/RdfValidator';
import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import type { RepresentationConverter } from '../../../../src/storage/conversion/RepresentationConverter';
import { readableToString } from '../../../../src/util/StreamUtil';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';
import 'jest-rdf';

describe('An RdfValidator', (): void => {
  let converter: RepresentationConverter;
  let validator: RdfValidator;

  beforeEach(async(): Promise<void> => {
    converter = new StaticAsyncHandler<any>(true, null);
    validator = new RdfValidator(converter);
  });

  it('can handle all representations.', async(): Promise<void> => {
    await expect(validator.canHandle(null as any)).resolves.toBeUndefined();
  });

  it('always accepts content-type internal/quads.', async(): Promise<void> => {
    const representation = new BasicRepresentation('data', 'internal/quads');
    await expect(validator.handle(representation)).resolves.toBeUndefined();
  });

  it('validates data by running it through a converter.', async(): Promise<void> => {
    converter.handleSafe = jest.fn().mockResolvedValue(new BasicRepresentation('transformedData', 'wrongType'));
    const representation = new BasicRepresentation('data', 'content-type');
    const quads = representation.metadata.quads();
    await expect(validator.handle(representation)).resolves.toBeUndefined();
    // Make sure the data can still be streamed
    await expect(readableToString(representation.data)).resolves.toBe('data');
    // Make sure the metadata was not changed
    expect(quads).toBeRdfIsomorphic(representation.metadata.quads());
  });

  it('throws an error when validating invalid data.', async(): Promise<void> => {
    converter.handleSafe = jest.fn().mockRejectedValue(new Error('bad data!'));
    const representation = new BasicRepresentation('data', 'content-type');
    await expect(validator.handle(representation)).rejects.toThrow('bad data!');
    // Make sure the data on the readable has not been reset
    expect(representation.data.destroyed).toBe(true);
  });
});
