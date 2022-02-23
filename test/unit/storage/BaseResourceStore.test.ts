import { BaseResourceStore } from '../../../src/storage/BaseResourceStore';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';

const any: any = {};

describe('A BaseResourceStore', (): void => {
  const store = new BaseResourceStore();
  it('errors on getRepresentation.', async(): Promise<void> => {
    await expect(store.getRepresentation(any, any)).rejects.toThrow(NotImplementedHttpError);
  });

  it('errors on addResource.', async(): Promise<void> => {
    await expect(store.addResource(any, any)).rejects.toThrow(NotImplementedHttpError);
  });

  it('errors on setRepresentation.', async(): Promise<void> => {
    await expect(store.setRepresentation(any, any)).rejects.toThrow(NotImplementedHttpError);
  });

  it('errors on deleteResource.', async(): Promise<void> => {
    await expect(store.deleteResource(any, any)).rejects.toThrow(NotImplementedHttpError);
  });

  it('errors on modifyResource.', async(): Promise<void> => {
    await expect(store.modifyResource(any, any)).rejects.toThrow(NotImplementedHttpError);
  });

  it('errors on hasResource.', async(): Promise<void> => {
    await expect(store.hasResource(any)).rejects.toThrow(NotImplementedHttpError);
  });
});
