// These two eslint lines are needed to store 'this' in a variable so it can be used
// in the PassThrough of createQuotaGuard
import { PassThrough } from 'node:stream';
import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { PayloadHttpError } from '../../util/errors/PayloadHttpError';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import type { Size } from '../size-reporter/Size';
import type { SizeReporter } from '../size-reporter/SizeReporter';

/**
 * A QuotaStrategy is used when we want to set a limit to the amount of data that can be
 * stored on the server.
 * This can range from a limit for the whole server to a limit on a per pod basis.
 * The way the size of a resource is calculated is implemented by the implementing classes.
 * This can be bytes, quads, file count, ...
 */
export abstract class QuotaStrategy {
  public readonly reporter: SizeReporter<unknown>;
  public readonly limit: Size;

  protected constructor(reporter: SizeReporter<unknown>, limit: Size) {
    this.reporter = reporter;
    this.limit = limit;
  }

  /**
   * Get the available space when writing data to the given identifier.
   * If the given resource already exists it will deduct the already taken up
   * space by that resource since it is going to be overwritten and thus counts
   * as available space.
   *
   * @param identifier - the identifier of the resource of which you want the available space
   *
   * @returns the available space and the unit of the space as a Size object
   */
  public async getAvailableSpace(identifier: ResourceIdentifier): Promise<Size> {
    const totalUsed = await this.getTotalSpaceUsed(identifier);

    // Ignore identifiers where quota does not apply
    if (totalUsed.amount === Number.MAX_SAFE_INTEGER) {
      return totalUsed;
    }

    // When a file is overwritten the space the file takes up right now should also
    // be counted as available space as it will disappear/be overwritten
    totalUsed.amount -= (await this.reporter.getSize(identifier)).amount;

    return {
      amount: this.limit.amount - totalUsed.amount,
      unit: this.limit.unit,
    };
  }

  /**
   * Get the currently used/occupied space.
   *
   * @param identifier - the identifier that should be used to calculate the total
   *
   * @returns a Size object containing the requested value.
   * If quota is not relevant for this identifier, Size.amount should be Number.MAX_SAFE_INTEGER
   */
  protected abstract getTotalSpaceUsed(identifier: ResourceIdentifier): Promise<Size>;

  /**
   * Get an estimated size of the resource
   *
   * @param metadata - the metadata that might include the size
   *
   * @returns a Size object containing the estimated size and unit of the resource
   */
  public async estimateSize(metadata: RepresentationMetadata): Promise<Size | undefined> {
    const estimate = await this.reporter.estimateSize(metadata);
    return estimate ? { unit: this.limit.unit, amount: estimate } : undefined;
  }

  /**
   * Get a Passthrough stream that will keep track of the available space.
   * If the quota is exceeded the stream will emit an error and destroy itself.
   * Like other Passthrough instances this will simply pass on the chunks, when the quota isn't exceeded.
   *
   * @param identifier - the identifier of the resource in question
   *
   * @returns a Passthrough instance that errors when quota is exceeded
   */
  public async createQuotaGuard(identifier: ResourceIdentifier): Promise<Guarded<PassThrough>> {
    let total = 0;
    // eslint-disable-next-line ts/no-this-alias
    const that = this;
    const { reporter } = this;

    return guardStream(new PassThrough({
      async transform(this, chunk: unknown, enc: string, done: () => void): Promise<void> {
        total += await reporter.calculateChunkSize(chunk);
        const availableSpace = await that.getAvailableSpace(identifier);
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
