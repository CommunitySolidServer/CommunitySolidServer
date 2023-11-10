import type { Representation } from '../../../../src/http/representation/Representation';
import type { RepresentationPreferences } from '../../../../src/http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { RepresentationConverter } from '../../../../src/storage/conversion/RepresentationConverter';
import { PreferenceSupport } from '../../../../src/storage/routing/PreferenceSupport';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';

describe('A PreferenceSupport', (): void => {
  let preferences: RepresentationPreferences;
  let converter: RepresentationConverter;
  let support: PreferenceSupport;
  const type = 'internal/quads';
  const identifier: ResourceIdentifier = 'identifier' as any;
  const representation: Representation = 'representation' as any;

  beforeEach(async(): Promise<void> => {
    preferences = { type: { [type]: 1 }};
    converter = { canHandle: jest.fn() } as any;
    support = new PreferenceSupport(preferences, converter);
  });

  it('returns true if the converter supports the input.', async(): Promise<void> => {
    await expect(support.supports({ identifier, representation })).resolves.toBe(true);
    expect(converter.canHandle).toHaveBeenCalledTimes(1);
    expect(converter.canHandle).toHaveBeenLastCalledWith({ identifier, representation, preferences });
  });

  it('returns false if the converter does not support the input.', async(): Promise<void> => {
    jest.spyOn(converter, 'canHandle').mockImplementation((): any => {
      throw new BadRequestHttpError();
    });
    await expect(support.supports({ identifier, representation })).resolves.toBe(false);
    expect(converter.canHandle).toHaveBeenCalledTimes(1);
    expect(converter.canHandle).toHaveBeenLastCalledWith({ identifier, representation, preferences });
  });
});
