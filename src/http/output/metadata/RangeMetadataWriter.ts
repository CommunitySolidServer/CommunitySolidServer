import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import { SOLID_HTTP } from '../../../util/Vocabularies';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * Generates the necessary `content-range` header if there is range metadata.
 * If the start or end is unknown, a `*` will be used instead.
 * According to the RFC, this is incorrect,
 * but is all we can do as long as we don't know the full length of the representation in advance.
 * For the same reason, the total length of the representation will always be `*`.
 */
export class RangeMetadataWriter extends MetadataWriter {
  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const unit = input.metadata.get(SOLID_HTTP.terms.unit);
    if (!unit) {
      return;
    }
    const start = input.metadata.get(SOLID_HTTP.terms.start);
    const end = input.metadata.get(SOLID_HTTP.terms.end);

    addHeader(input.response, 'Content-Range', `${unit.value} ${start?.value ?? '*'}-${end?.value ?? '*'}/*`);
  }
}
