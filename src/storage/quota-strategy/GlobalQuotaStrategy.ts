// These two eslint lines are needed to store 'this' in a variable so it can be used
// in the PassThrough of trackAvailableSpace
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable consistent-this */
import { PassThrough } from 'stream';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { PayloadHttpError } from '../../util/errors/PayloadHttpError';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import type { Size } from '../size-reporter/Size';
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

  /** The estimated size of a resource in this strategy is simply the content-length header */
  public async estimateSize(metadata: RepresentationMetadata): Promise<Size> {
    return {
      amount: metadata.contentLength ? Number(metadata.contentLength) : 0,
      unit: this.limit.unit,
    };
  }

  public async trackAvailableSpace(identifier: ResourceIdentifier): Promise<Guarded<PassThrough>> {
    let total = 0;
    const strategy = this;

    return guardStream(new PassThrough({
      // An arrow function cannot have a 'this' parameter.ts(2730)
      // eslint-disable-next-line object-shorthand
      transform: async function(this, chunk: any, enc: string, done: () => void): Promise<void> {
        total += chunk.length;
        const availableSpace = await strategy.getAvailableSpace(identifier);
        if (availableSpace.amount < total) {
          this.destroy(new PayloadHttpError(
            `Quota exceeded by ${total - availableSpace.amount} ${availableSpace.unit} during write`,
          ));
        }

        this.push(chunk);
        done();
      },
    }));
  }
}

