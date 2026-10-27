import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { DataAccessor } from '../../../src/storage/accessors/DataAccessor';
import { PodQuotaStrategy } from '../../../src/storage/quota/PodQuotaStrategy';
import { UNIT_BYTES } from '../../../src/storage/size-reporter/Size';
import type { Size } from '../../../src/storage/size-reporter/Size';
import type { SizeReporter } from '../../../src/storage/size-reporter/SizeReporter';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import type { IdentifierStrategy } from '../../../src/util/identifiers/IdentifierStrategy';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { SubdomainIdentifierStrategy } from '../../../src/util/identifiers/SubdomainIdentifierStrategy';
import { PIM, RDF } from '../../../src/util/Vocabularies';
import { mockFileSystem } from '../../util/Util';

jest.mock('node:fs');

describe('PodQuotaStrategy', (): void => {
  let strategy: PodQuotaStrategy;
  let mockSize: Size;
  let mockReporter: jest.Mocked<SizeReporter<any>>;
  let identifierStrategy: IdentifierStrategy;
  let accessor: jest.Mocked<DataAccessor>;
  const base = 'http://localhost:3000/';
  const rootFilePath = 'folder';

  beforeEach((): void => {
    jest.restoreAllMocks();
    mockFileSystem(rootFilePath, new Date());
    mockSize = { amount: 2000, unit: UNIT_BYTES };
    identifierStrategy = new SingleRootIdentifierStrategy(base);
    mockReporter = {
      getSize: jest.fn().mockResolvedValue({ unit: mockSize.unit, amount: 50 }),
      getUnit: jest.fn().mockReturnValue(mockSize.unit),
      calculateChunkSize: jest.fn(async(chunk: any): Promise<number> => chunk.length),
      estimateSize: jest.fn().mockResolvedValue(5),
    };
    accessor = {
      // Assume that the pod is called "nested"
      getMetadata: jest.fn().mockImplementation(
        async(identifier: ResourceIdentifier): Promise<RepresentationMetadata> => {
          const res = new RepresentationMetadata();
          if (identifier.path === `${base}nested/`) {
            res.add(RDF.terms.type, PIM.Storage);
          }
          return res;
        },
      ),
    } as any;
    strategy = new PodQuotaStrategy(mockSize, mockReporter, identifierStrategy, accessor, base);
  });

  describe('getAvailableSpace()', (): void => {
    it('should return a Size containing MAX_SAFE_INTEGER when writing outside a pod.', async(): Promise<void> => {
      const result = strategy.getAvailableSpace({ path: `${base}file.txt` });
      await expect(result).resolves.toEqual(expect.objectContaining({ amount: Number.MAX_SAFE_INTEGER }));
    });

    it('should ignore the size of the existing resource when writing inside a pod.', async(): Promise<void> => {
      const result = strategy.getAvailableSpace({ path: `${base}nested/nested2/file.txt` });
      await expect(result).resolves.toEqual(expect.objectContaining({ amount: mockSize.amount }));
      expect(mockReporter.getSize).toHaveBeenCalledTimes(2);
    });

    it('should return a Size containing the available space when writing inside a pod.', async(): Promise<void> => {
      accessor.getMetadata.mockImplementationOnce((): any => {
        throw new NotFoundHttpError();
      });
      const result = strategy.getAvailableSpace({ path: `${base}nested/nested2/file.txt` });
      await expect(result).resolves.toEqual(expect.objectContaining({ amount: mockSize.amount }));
      expect(mockReporter.getSize).toHaveBeenCalledTimes(2);
    });

    it('should throw when looking for pim:Storage errors.', async(): Promise<void> => {
      accessor.getMetadata.mockImplementationOnce((): any => {
        throw new Error('error');
      });
      const result = strategy.getAvailableSpace({ path: `${base}nested/nested2/file.txt` });
      await expect(result).rejects.toThrow('error');
    });
  });

  describe('in subdomain mode', (): void => {
    // Each subdomain is a pod root, and IS a root container for
    // SubdomainIdentifierStrategy. searchPimStorage must read the pim:Storage
    // metadata BEFORE stopping at the root container, otherwise no pod is ever
    // found and quota is silently unlimited.
    let subdomainStrategy: IdentifierStrategy;

    beforeEach((): void => {
      subdomainStrategy = new SubdomainIdentifierStrategy(base);
      accessor.getMetadata.mockImplementation(
        async(identifier: ResourceIdentifier): Promise<RepresentationMetadata> => {
          const res = new RepresentationMetadata();
          if (identifier.path === 'http://alice.localhost:3000/') {
            res.add(RDF.terms.type, PIM.Storage);
          }
          return res;
        },
      );
    });

    it('finds the pod inside a subdomain pod (pod root is a root container).', async(): Promise<void> => {
      strategy = new PodQuotaStrategy(mockSize, mockReporter, subdomainStrategy, accessor, base);
      const result = strategy.getAvailableSpace({ path: 'http://alice.localhost:3000/public/file.txt' });
      await expect(result).resolves.toEqual(expect.objectContaining({ amount: mockSize.amount }));
      expect(mockReporter.getSize).toHaveBeenCalledTimes(2);
    });

    it('should return MAX_SAFE_INTEGER when writing to the base root (not a pod).', async(): Promise<void> => {
      strategy = new PodQuotaStrategy(mockSize, mockReporter, subdomainStrategy, accessor, base);
      const result = strategy.getAvailableSpace({ path: 'http://localhost:3000/file.txt' });
      await expect(result).resolves.toEqual(expect.objectContaining({ amount: Number.MAX_SAFE_INTEGER }));
    });

    it('keeps internal writes unlimited even when the base root is a storage.', async(): Promise<void> => {
      // Simulate RootStorageLocationStrategy: the base root is also marked as
      // a storage. Internal writes (`/.internal/`) must still be unlimited.
      accessor.getMetadata.mockImplementation(
        async(identifier: ResourceIdentifier): Promise<RepresentationMetadata> => {
          const res = new RepresentationMetadata();
          if (identifier.path === 'http://alice.localhost:3000/' || identifier.path === 'http://localhost:3000/') {
            res.add(RDF.terms.type, PIM.Storage);
          }
          return res;
        },
      );
      strategy = new PodQuotaStrategy(mockSize, mockReporter, subdomainStrategy, accessor, base);
      const result = strategy.getAvailableSpace({ path: 'http://localhost:3000/.internal/accounts/123' });
      await expect(result).resolves.toEqual(expect.objectContaining({ amount: Number.MAX_SAFE_INTEGER }));
    });

    it('treats the exact `/.internal` container as internal (no trailing slash).', async(): Promise<void> => {
      strategy = new PodQuotaStrategy(mockSize, mockReporter, subdomainStrategy, accessor, base);
      const result = strategy.getAvailableSpace({ path: 'http://localhost:3000/.internal' });
      await expect(result).resolves.toEqual(expect.objectContaining({ amount: Number.MAX_SAFE_INTEGER }));
    });

    it('stops at a root container when its metadata is missing (NotFound).', async(): Promise<void> => {
      // Metadata is missing (NotFound) at the subdomain root (a root container) —
      // discovery must stop there and report no pod.
      accessor.getMetadata.mockImplementationOnce((): any => {
        throw new NotFoundHttpError();
      });
      strategy = new PodQuotaStrategy(mockSize, mockReporter, subdomainStrategy, accessor, base);
      const result = strategy.getAvailableSpace({ path: 'http://alice.localhost:3000/' });
      await expect(result).resolves.toEqual(expect.objectContaining({ amount: Number.MAX_SAFE_INTEGER }));
    });

    it('keeps internal writes unlimited when the base URL has a path prefix.', async(): Promise<void> => {
      strategy = new PodQuotaStrategy(mockSize, mockReporter, subdomainStrategy, accessor, 'http://example.com/my-server/');
      const result = strategy.getAvailableSpace({ path: 'http://example.com/my-server/.internal/accounts/123' });
      await expect(result).resolves.toEqual(expect.objectContaining({ amount: Number.MAX_SAFE_INTEGER }));
    });

    it('uses a custom internal folder when configured.', async(): Promise<void> => {
      strategy = new PodQuotaStrategy(mockSize, mockReporter, subdomainStrategy, accessor, base, '/.hidden/');
      const result = strategy.getAvailableSpace({ path: 'http://localhost:3000/.hidden/data' });
      await expect(result).resolves.toEqual(expect.objectContaining({ amount: Number.MAX_SAFE_INTEGER }));
    });
  });
});
