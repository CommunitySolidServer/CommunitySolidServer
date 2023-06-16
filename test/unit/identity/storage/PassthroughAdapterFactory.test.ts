import type { AdapterFactory } from '../../../../src/identity/storage/AdapterFactory';
import {
  PassthroughAdapter,
  PassthroughAdapterFactory,
} from '../../../../src/identity/storage/PassthroughAdapterFactory';
import type { Adapter } from '../../../../templates/types/oidc-provider';

describe('A PassthroughAdapterFactory', (): void => {
  let sourceFactory: jest.Mocked<AdapterFactory>;
  let factory: PassthroughAdapterFactory;

  beforeEach(async(): Promise<void> => {
    sourceFactory = {
      createStorageAdapter: jest.fn(),
    };

    factory = new PassthroughAdapterFactory(sourceFactory);
  });

  it('calls the source createStorageAdapter function.', async(): Promise<void> => {
    expect(factory.createStorageAdapter('Client')).toBeUndefined();
    expect(sourceFactory.createStorageAdapter).toHaveBeenCalledTimes(1);
    expect(sourceFactory.createStorageAdapter).toHaveBeenLastCalledWith('Client');
  });

  describe('A PassthroughAdapter', (): void => {
    let sourceAdapter: jest.Mocked<Adapter>;
    let adapter: PassthroughAdapter;

    beforeEach(async(): Promise<void> => {
      sourceAdapter = {
        upsert: jest.fn(),
        find: jest.fn(),
        findByUserCode: jest.fn(),
        findByUid: jest.fn(),
        consume: jest.fn(),
        destroy: jest.fn(),
        revokeByGrantId: jest.fn(),
      };

      adapter = new PassthroughAdapter('Name', sourceAdapter);
    });

    it('passes the call to the source for upsert.', async(): Promise<void> => {
      await expect(adapter.upsert('id', 'payload' as any, 5)).resolves.toBeUndefined();
      expect(sourceAdapter.upsert).toHaveBeenCalledTimes(1);
      expect(sourceAdapter.upsert).toHaveBeenLastCalledWith('id', 'payload' as any, 5);
    });

    it('passes the call to the source for find.', async(): Promise<void> => {
      await expect(adapter.find('id')).resolves.toBeUndefined();
      expect(sourceAdapter.find).toHaveBeenCalledTimes(1);
      expect(sourceAdapter.find).toHaveBeenLastCalledWith('id');
    });

    it('passes the call to the source for findByUserCode.', async(): Promise<void> => {
      await expect(adapter.findByUserCode('userCode')).resolves.toBeUndefined();
      expect(sourceAdapter.findByUserCode).toHaveBeenCalledTimes(1);
      expect(sourceAdapter.findByUserCode).toHaveBeenLastCalledWith('userCode');
    });

    it('passes the call to the source for findByUid.', async(): Promise<void> => {
      await expect(adapter.findByUid('uid')).resolves.toBeUndefined();
      expect(sourceAdapter.findByUid).toHaveBeenCalledTimes(1);
      expect(sourceAdapter.findByUid).toHaveBeenLastCalledWith('uid');
    });

    it('passes the call to the source for destroy.', async(): Promise<void> => {
      await expect(adapter.destroy('id')).resolves.toBeUndefined();
      expect(sourceAdapter.destroy).toHaveBeenCalledTimes(1);
      expect(sourceAdapter.destroy).toHaveBeenLastCalledWith('id');
    });

    it('passes the call to the source for revokeByGrantId.', async(): Promise<void> => {
      await expect(adapter.revokeByGrantId('grantId')).resolves.toBeUndefined();
      expect(sourceAdapter.revokeByGrantId).toHaveBeenCalledTimes(1);
      expect(sourceAdapter.revokeByGrantId).toHaveBeenLastCalledWith('grantId');
    });

    it('passes the call to the source for consume.', async(): Promise<void> => {
      await expect(adapter.consume('id')).resolves.toBeUndefined();
      expect(sourceAdapter.consume).toHaveBeenCalledTimes(1);
      expect(sourceAdapter.consume).toHaveBeenLastCalledWith('id');
    });
  });
});
