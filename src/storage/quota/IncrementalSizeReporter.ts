import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Size } from '../size-reporter/Size';
import { UNIT_BYTES } from '../size-reporter/Size';
import type { SizeReporter } from '../size-reporter/SizeReporter';
import type { QuotaCounter } from './QuotaCounter';

/**
 * {@link SizeReporter} backed by the incremental {@link QuotaCounter}.
 *
 * - `getSize(podRoot)` → **O(1)** counter read (recount only on bootstrap /
 *   staleness).
 * - `getSize(any other resource)` → single stat (used by
 *   `QuotaStrategy.getAvailableSpace` to subtract the overwritten resource).
 */
export class IncrementalSizeReporter implements SizeReporter<unknown> {
  private readonly counter: QuotaCounter;

  public constructor(counter: QuotaCounter) {
    this.counter = counter;
  }

  public getUnit(): string {
    return UNIT_BYTES;
  }

  public async getSize(identifier: ResourceIdentifier): Promise<Size> {
    if (await this.counter.isPodRoot(identifier)) {
      return this.counter.getSize(identifier);
    }
    return { unit: UNIT_BYTES, amount: await this.counter.sizeOfResource(identifier) };
  }

  public async calculateChunkSize(chunk: unknown): Promise<number> {
    return Buffer.isBuffer(chunk) ? chunk.length : Number((chunk as { length?: number }).length) || 0;
  }

  public async estimateSize(metadata: RepresentationMetadata): Promise<number | undefined> {
    return metadata.contentLength;
  }
}
