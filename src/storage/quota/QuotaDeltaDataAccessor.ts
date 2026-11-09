import { promises as fs } from 'node:fs';
import type { Readable } from 'node:stream';
import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { IdentifierStrategy } from '../../util/identifiers/IdentifierStrategy';
import { PassthroughDataAccessor } from '../accessors/PassthroughDataAccessor';
import type { DataAccessor } from '../accessors/DataAccessor';
import type { FileIdentifierMapper } from '../mapping/FileIdentifierMapper';
import { isInternalPath } from './InternalPath';
import { discoverPod } from './PodDiscovery';
import type { QuotaCounter } from './QuotaCounter';

/**
 * Wraps the top of the file accessor chain and, for every mutation,
 * computes the resource's apparent-byte delta (before/after)
 * and feeds it to the {@link QuotaCounter}.
 *
 * Cases handled:
 * - create/overwrite document: Δ = new − old (data + metadata file)
 * - delete resource: Δ = −(data + metadata size)
 * - create/delete container: Δ from a walk (captures directory sizes)
 */
export class QuotaDeltaDataAccessor extends PassthroughDataAccessor {
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly counter: QuotaCounter;
  private readonly fileIdentifierMapper: FileIdentifierMapper;
  private readonly podCache = new Map<string, ResourceIdentifier | null>();

  public constructor(
    accessor: DataAccessor,
    identifierStrategy: IdentifierStrategy,
    counter: QuotaCounter,
    fileIdentifierMapper: FileIdentifierMapper,
  ) {
    super(accessor);
    this.identifierStrategy = identifierStrategy;
    this.counter = counter;
    this.fileIdentifierMapper = fileIdentifierMapper;
  }

  public async writeDocument(
    identifier: ResourceIdentifier,
    data: Guarded<Readable>,
    metadata: RepresentationMetadata,
  ): Promise<void> {
    await this.track(identifier, async(): Promise<void> => this.accessor.writeDocument(identifier, data, metadata));
  }

  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    await this.track(identifier, async(): Promise<void> => this.accessor.writeContainer(identifier, metadata));
  }

  public async writeMetadata(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    await this.track(identifier, async(): Promise<void> => this.accessor.writeMetadata(identifier, metadata));
  }

  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    if (isInternalPath(identifier)) {
      await this.accessor.deleteResource(identifier);
      return;
    }
    const before = await this.sizeOf(identifier);
    await this.accessor.deleteResource(identifier);
    const after = await this.sizeOf(identifier);
    const delta = after - before;
    const pod = await this.findPod(identifier);
    if (pod === null) {
      return;
    }
    // Deleting the pod root itself → drop the counter entirely.
    if (pod.path === identifier.path) {
      await this.counter.remove(identifier);
      return;
    }
    if (delta !== 0) {
      await this.counter.register(pod);
      await this.counter.add(pod, delta);
    }
  }

  // --- Delta tracking ---

  private async track(identifier: ResourceIdentifier, op: () => Promise<void>): Promise<void> {
    if (isInternalPath(identifier)) {
      await op();
      return;
    }
    const before = await this.sizeOf(identifier);
    await op();
    const after = await this.sizeOf(identifier);
    const pod = await this.findPod(identifier);
    if (pod === null) {
      return;
    }
    await this.counter.register(pod);
    const delta = after - before;
    if (delta !== 0) {
      await this.counter.add(pod, delta);
    }
  }

  /** Apparent size of the resource: data file + metadata file (+ walk for containers). */
  private async sizeOf(identifier: ResourceIdentifier): Promise<number> {
    const data = await this.stat(identifier, false);
    const meta = await this.stat(identifier, true);
    return data + meta;
  }

  private async stat(identifier: ResourceIdentifier, isMetadata: boolean): Promise<number> {
    try {
      const { filePath } = await this.fileIdentifierMapper.mapUrlToFilePath(identifier, isMetadata);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        return await this.counter.walk(identifier);
      }
      return stat.size;
    } catch {
      return 0;
    }
  }

  // --- Pod discovery (mirrors PodQuotaStrategy.searchPimStorage) ---

  private async findPod(identifier: ResourceIdentifier): Promise<ResourceIdentifier | null> {
    const path = await this.counter.mapDataPath(identifier);
    const cached = this.podCache.get(path);
    if (cached !== undefined) {
      return cached;
    }
    const pod = await this.discoverPod(identifier);
    this.podCache.set(path, pod);
    return pod;
  }

  private async discoverPod(identifier: ResourceIdentifier): Promise<ResourceIdentifier | null> {
    // Uses the metadata-before-root-container order so subdomain-mode pod
    // roots are discovered.
    return discoverPod(identifier, this.accessor, this.identifierStrategy);
  }
}
