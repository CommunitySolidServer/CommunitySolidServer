import type { HttpResponse } from '../../../server/HttpResponse';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';

export interface MetadataWriterInput {
  response: HttpResponse;
  metadata: RepresentationMetadata;
}

/**
 * A serializer that converts metadata to headers for an HttpResponse.
 */
export abstract class MetadataWriter extends AsyncHandler<MetadataWriterInput> {}
