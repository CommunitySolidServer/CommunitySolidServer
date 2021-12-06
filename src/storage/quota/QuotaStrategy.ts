// These two eslint lines are needed to store 'this' in a variable so it can be used
// in the PassThrough of createQuotaGuard
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable consistent-this */
import { PassThrough } from 'stream';
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
  public readonly reporter: SizeReporter<any>;
  public readonly limit: Size;

  public constructor(reporter: SizeReporter<any>, limit: Size) {
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
   * @returns the available space and the unit of the space as a Size object
   */
  public abstract getAvailableSpace: (identifier: ResourceIdentifier) => Promise<Size>;

  /**
   * Get an estimated size of the resource
   *
   * @param metadata - the metadata that might include the size
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
   * @param data - the Readable stream that belongs to the identifier
   * @param metadata - the RepresentationMetadata that belongs to the identifier
   * @returns a Passthrough instance that errors when quota is exceeded
   */
  public async createQuotaGuard(identifier: ResourceIdentifier): Promise<Guarded<PassThrough>> {
    let total = 0;
    const strategy = this;
    const { reporter } = this;

    return guardStream(new PassThrough({
      async transform(this, chunk: any, enc: string, done: () => void): Promise<void> {
        total += await reporter.calculateChunkSize(chunk);
        const availableSpace = await strategy.getAvailableSpace(identifier);
        if (availableSpace.amount < total) {
          console.log('Quota exceeded during write', { total, availableSpace, identifier });
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
