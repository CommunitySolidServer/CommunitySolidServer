import type { Size } from '../size-reporter/Size';
import type { SizeReporter } from '../size-reporter/SizeReporter';
import { QuotaStrategy } from './QuotaStrategy';

/**
 * The GlobalQuotaStrategy sets a limit on the amount of data stored on the server globally.
 */
export class GlobalQuotaStrategy extends QuotaStrategy {
  private readonly base: string;

  public constructor(limit: Size, reporter: SizeReporter<unknown>, base: string) {
    super(reporter, limit);
    this.base = base;
  }

  protected async getTotalSpaceUsed(): Promise<Size> {
    return this.reporter.getSize({ path: this.base });
  }
}
