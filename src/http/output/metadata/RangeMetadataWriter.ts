import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import { termToInt } from '../../../util/QuadUtil';
import { POSIX, SOLID_HTTP } from '../../../util/Vocabularies';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * Generates the necessary `content-range` header if there is range metadata.
 * If the start or end is unknown, a `*` will be used instead.
 * According to the RFC, this is incorrect,
 * but is all we can do as long as we don't know the full length of the representation in advance.
 * For the same reason, the total length of the representation will always be `*`.
 *
 * This class also adds the content-length header.
 * This will contain either the full size for standard requests,
 * or the size of the slice for range requests.
 */
export class RangeMetadataWriter extends MetadataWriter {
  protected readonly logger = getLoggerFor(this);

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const size = termToInt(input.metadata.get(POSIX.terms.size));
    const unit = input.metadata.get(SOLID_HTTP.terms.unit)?.value;
    if (!unit) {
      if (typeof size === 'number') {
        addHeader(input.response, 'Content-Length', `${size}`);
      }
      return;
    }

    let start = termToInt(input.metadata.get(SOLID_HTTP.terms.start));
    if (typeof start === 'number' && start < 0 && typeof size === 'number') {
      start = size + start;
    }
    let end = termToInt(input.metadata.get(SOLID_HTTP.terms.end));
    if (typeof end !== 'number' && typeof size === 'number') {
      end = size - 1;
    }

    const rangeHeader = `${unit} ${start ?? '*'}-${end ?? '*'}/${size ?? '*'}`;
    addHeader(input.response, 'Content-Range', rangeHeader);
    if (typeof start === 'number' && typeof end === 'number') {
      addHeader(input.response, 'Content-Length', `${end - start + 1}`);
    } else {
      this.logger.warn(`Generating invalid content-range header due to missing size information: ${rangeHeader}`);
    }
  }
}
