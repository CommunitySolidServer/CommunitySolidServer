import type { Representation } from '../../../../src/ldp/representation/Representation';
import type { RepresentationPreferences } from '../../../../src/ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import type { RepresentationConverter } from '../../../../src/storage/conversion/RepresentationConverter';
import { PreferenceSupport } from '../../../../src/storage/routing/PreferenceSupport';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A PreferenceSupport', (): void => {
  const type = 'internal/quads';
  const preferences: RepresentationPreferences = { type: [{ value: type, weight: 1 }]};
  let converter: RepresentationConverter;
  let support: PreferenceSupport;
  const identifier: ResourceIdentifier = 'identifier' as any;
  const representation: Representation = 'representation' as any;

  beforeEach(async(): Promise<void> => {
    converter = { canHandle: jest.fn() } as any;
    support = new PreferenceSupport(type, converter);
  });

  it('returns true if the converter supports the input.', async(): Promise<void> => {
    await expect(support.supports({ identifier, representation })).resolves.toBe(true);
    expect(converter.canHandle).toHaveBeenCalledTimes(1);
    expect(converter.canHandle).toHaveBeenLastCalledWith({ identifier, representation, preferences });
  });

  it('returns false if the converter does not support the input.', async(): Promise<void> => {
    converter.canHandle = jest.fn((): any => {
      throw new UnsupportedHttpError();
    });
    await expect(support.supports({ identifier, representation })).resolves.toBe(false);
    expect(converter.canHandle).toHaveBeenCalledTimes(1);
    expect(converter.canHandle).toHaveBeenLastCalledWith({ identifier, representation, preferences });
  });
});
