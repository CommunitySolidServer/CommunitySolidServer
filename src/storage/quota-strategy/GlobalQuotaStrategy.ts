import type { Readable } from 'stream';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import { guardedStreamFrom } from '../../util/StreamUtil';
import type { Size } from '../size-reporter/size.model';
import type { SizeReporter } from '../size-reporter/SizeReporter';
import type { QuotaStrategy } from './QuotaStrategy';

export class GlobalQuotaStrategy implements QuotaStrategy {
  public readonly limit: Size;
  private readonly reporter: SizeReporter;

  public constructor(podSize: Size, reporter: SizeReporter) {
    this.limit = podSize;
    this.reporter = reporter;
  }

  public getAvailableSpace(): Size {
    return {
      amount: this.limit.amount - this.reporter.getSize({ path: './' }).amount,
      unit: this.limit.unit,
    };
  }

  public estimateSize(metadata: RepresentationMetadata): Size {
    return { amount: 20, unit: 'placeholder' };
  }

  public trackAvailableSpace(
    identifier: ResourceIdentifier,
    data: Guarded<Readable>,
    // Not using - metadata: RepresentationMetadata,
  ): Guarded<Readable> {
    const newStream = guardedStreamFrom('');
    data.on('data', (chunk): void => {
      const available = this.getAvailableSpace().amount;
      const chunkSize: number = chunk;
      newStream.push(available - chunkSize);
    });
    return newStream;
  }
}
