import type { Readable } from 'stream';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import { guardedStreamFrom } from '../../util/StreamUtil';
import type { Size } from '../size-reporter/size.model';
import type { SizeReporter } from '../size-reporter/SizeReporter';
import type { QuotaStrategy } from './QuotaStrategy';

/**
 * The GlobalQuotaStrategy sets a limit on the amount of data stored on the server globally
 */
export class GlobalQuotaStrategy implements QuotaStrategy {
  public readonly limit: Size;
  private readonly reporter: SizeReporter;
  private readonly base: string;

  public constructor(
    limitUnit: string,
    limitAmount: number,
    reporter: SizeReporter,
    base: string,
  ) {
    this.limit = { unit: limitUnit, amount: limitAmount };
    this.reporter = reporter;
    this.base = base;
  }

  public async getAvailableSpace(
    identifier: ResourceIdentifier,
  ): Promise<Size> {
    let used = (await this.reporter.getSize({ path: this.base })).amount;
    // When a file overwritten the space the file takes up right now should also
    // be counted as available space as it will disappear/overwritten
    used -= (await this.reporter.getSize(identifier)).amount;

    return {
      amount: this.limit.amount - used,
      unit: this.limit.unit,
    };
  }

  public async estimateSize(metadata: RepresentationMetadata): Promise<Size> {
    return {
      amount: metadata.contentLength ? Number(metadata.contentLength) : 0,
      unit: this.limit.unit,
    };
  }

  public async trackAvailableSpace(
    identifier: ResourceIdentifier,
    data: Guarded<Readable>,
    // Not using - metadata: RepresentationMetadata,
  ): Promise<Guarded<Readable>> {
    const newStream = guardedStreamFrom('');
    let total = 0;
    const available = (await this.getAvailableSpace(identifier)).amount;
    console.log('======= avail before: ', available);
    data.on('data', (chunk): void => {
      total += chunk.length;
      console.log('======= total size: ', total);
      newStream.push(available - total);
    });
    return newStream;
  }
}

