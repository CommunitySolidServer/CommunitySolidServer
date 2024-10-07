import type { Representation } from '../http/representation/Representation';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { InternalServerError } from '../util/errors/InternalServerError';
import { RangeNotSatisfiedHttpError } from '../util/errors/RangeNotSatisfiedHttpError';
import { guardStream } from '../util/GuardedStream';
import { termToInt } from '../util/QuadUtil';
import { SliceStream } from '../util/SliceStream';
import { toLiteral } from '../util/TermUtil';
import { POSIX, SOLID_HTTP, XSD } from '../util/Vocabularies';
import type { Conditions } from './conditions/Conditions';
import { PassthroughStore } from './PassthroughStore';
import type { ResourceStore } from './ResourceStore';

/**
 * Resource store that slices the data stream if there are range preferences.
 * Only works for `bytes` range preferences on binary data streams.
 * Does not support multipart range requests.
 *
 * If the slice happens, unit/start/end values will be written to the metadata to indicate such.
 * The values are dependent on the preferences we got as an input,
 * as we don't know the actual size of the data stream.
 *
 * The `defaultSliceSize` parameter can be used to set how large a slice should be if the end of a range is not defined.
 * Setting this to 0, which is the default, will cause the end of the stream to be used as the end of the slice.
 */
export class BinarySliceResourceStore<T extends ResourceStore = ResourceStore> extends PassthroughStore<T> {
  protected readonly logger = getLoggerFor(this);
  private readonly defaultSliceSize: number;

  public constructor(source: T, defaultSliceSize = 0) {
    super(source);
    this.defaultSliceSize = defaultSliceSize;
  }

  public async getRepresentation(
    identifier: ResourceIdentifier,
    preferences: RepresentationPreferences,
    conditions?: Conditions,
  ): Promise<Representation> {
    const result = await this.source.getRepresentation(identifier, preferences, conditions);

    if (!preferences.range || preferences.range.unit !== 'bytes' || preferences.range.parts.length === 0) {
      return result;
    }
    if (result.metadata.has(SOLID_HTTP.unit)) {
      this.logger.debug('Not slicing stream that has already been sliced.');
      return result;
    }

    if (!result.binary) {
      throw new InternalServerError('Trying to slice a non-binary stream.');
    }
    if (preferences.range.parts.length > 1) {
      throw new RangeNotSatisfiedHttpError('Multipart range requests are not supported.');
    }

    let [{ start, end }] = preferences.range.parts;
    const size = termToInt(result.metadata.get(POSIX.terms.size));

    // Set the default end size if not set already
    if (this.defaultSliceSize > 0 && typeof end !== 'number' && typeof size === 'number' && start >= 0) {
      end = Math.min(size, start + this.defaultSliceSize) - 1;
    }

    result.metadata.set(SOLID_HTTP.terms.unit, preferences.range.unit);
    result.metadata.set(SOLID_HTTP.terms.start, toLiteral(start, XSD.terms.integer));
    if (typeof end === 'number') {
      result.metadata.set(SOLID_HTTP.terms.end, toLiteral(end, XSD.terms.integer));
    }

    try {
      // The reason we don't determine the object mode based on the object mode of the parent stream
      // is that `guardedStreamFrom` does not create object streams when inputting streams/buffers.
      // Something to potentially update in the future.
      result.data = guardStream(new SliceStream(result.data, { start, end, size, objectMode: false }));
    } catch (error: unknown) {
      // Creating the slice stream can throw an error if some of the parameters are unacceptable.
      // Need to make sure the stream is closed in that case.
      result.data.destroy();
      throw error;
    }
    return result;
  }
}
