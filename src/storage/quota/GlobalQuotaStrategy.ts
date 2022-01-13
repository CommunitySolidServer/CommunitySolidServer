import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Size } from '../size-reporter/Size';
import type { SizeReporter } from '../size-reporter/SizeReporter';
import { QuotaStrategy } from './QuotaStrategy';

/**
 * The GlobalQuotaStrategy sets a limit on the amount of data stored on the server globally.
 */
export class GlobalQuotaStrategy extends QuotaStrategy {
  private readonly base: string;

  public constructor(limit: Size, reporter: SizeReporter<any>, base: string) {
    super(reporter, limit);
    this.base = base;
  }

  public async getAvailableSpace(identifier: ResourceIdentifier): Promise<Size> {
    let used = (await this.reporter.getSize({ path: this.base })).amount;
    // When a file is overwritten the space the file takes up right now should also
    // be counted as available space as it will disappear/be overwritten
    used -= (await this.reporter.getSize(identifier)).amount;

    return {
      amount: this.limit.amount - used,
      unit: this.limit.unit,
    };
  }
}
