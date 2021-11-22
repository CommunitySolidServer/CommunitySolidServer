import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Size } from '../size-reporter/Size';
import type { SizeReporter } from '../size-reporter/SizeReporter';
import { QuotaStrategy } from './QuotaStrategy';

/**
 * The GlobalQuotaStrategy sets a limit on the amount of data stored on the server globally
 */
export class GlobalQuotaStrategy extends QuotaStrategy {
  public readonly limit: Size;
  private readonly base: string;

  public constructor(limit: Size, reporter: SizeReporter<any>, base: string) {
    super(reporter);
    this.limit = limit;
    this.base = base;
  }

  public getAvailableSpace = async(identifier: ResourceIdentifier): Promise<Size> => {
    let used = (await this.reporter.getSize({ path: this.base })).amount;
    // When a file is overwritten the space the file takes up right now should also
    // be counted as available space as it will disappear/be overwritten
    used -= (await this.reporter.getSize(identifier)).amount;

    return {
      amount: this.limit.amount - used,
      unit: this.limit.unit,
    };
  };

  /** The estimated size of a resource in this strategy is simply the content-length header */
  public estimateSize = async(metadata: RepresentationMetadata): Promise<Size | undefined> => {
    if (!metadata.contentLength) {
      return undefined;
    }
    return {
      amount: metadata.contentLength,
      unit: this.limit.unit,
    };
  };
}

