import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { ConvertingRouterRule } from '../../../../src/storage/routing/ConvertingRouterRule';
import type { PreferenceSupport } from '../../../../src/storage/routing/PreferenceSupport';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';

describe('A ConvertingRouterRule', (): void => {
  let store1: ResourceStore;
  let defaultStore: ResourceStore;
  let checker1: PreferenceSupport;
  let rule: ConvertingRouterRule;
  let representation: Representation;
  let metadata: RepresentationMetadata;

  beforeEach(async(): Promise<void> => {
    store1 = { name: 'turtleStore' } as any;
    defaultStore = { name: 'defaultStore' } as any;

    checker1 = {
      async supports(input: { representation: Representation }): Promise<boolean> {
        return input.representation.metadata.contentType === 'text/turtle';
      },
    } as any;

    rule = new ConvertingRouterRule({ store: store1, supportChecker: checker1 }, defaultStore);

    metadata = new RepresentationMetadata();
    representation = { binary: true, data: 'data!' as any, metadata, isEmpty: false };
  });

  it('returns the corresponding store if it supports the input.', async(): Promise<void> => {
    metadata.contentType = 'text/turtle';
    await expect(rule.handle({ identifier: { path: 'identifier' }, representation })).resolves.toBe(store1);
  });

  it('returns the defaultStore if the converter does not support the input.', async(): Promise<void> => {
    await expect(rule.handle({ identifier: { path: 'identifier' }, representation })).resolves.toBe(defaultStore);
  });

  it('checks if the stores contain the identifier if there is no data.', async(): Promise<void> => {
    store1.hasResource = jest.fn().mockImplementationOnce((): any => true);
    await expect(rule.handle({ identifier: { path: 'identifier' }})).resolves.toBe(store1);
    expect(store1.hasResource).toHaveBeenCalledTimes(1);
  });

  it('returns the defaultStore if no other store has the resource.', async(): Promise<void> => {
    store1.hasResource = jest.fn().mockImplementationOnce((): any => false);
    await expect(rule.handle({ identifier: { path: 'identifier' }})).resolves.toBe(defaultStore);
  });

  it('throws the error if a store had a non-404 error.', async(): Promise<void> => {
    store1.hasResource = jest.fn().mockRejectedValueOnce(new InternalServerError());
    await expect(rule.handle({ identifier: { path: 'identifier' }})).rejects.toThrow(InternalServerError);
  });
});
