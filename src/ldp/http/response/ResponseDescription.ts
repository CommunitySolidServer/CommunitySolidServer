import type { Readable } from 'stream';
import type { Guarded } from '../../../util/GuardedStream';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';

/**
 * The result of executing an operation.
 */
export class ResponseDescription {
  public readonly statusCode: number;
  public readonly metadata?: RepresentationMetadata;
  public readonly data?: Guarded<Readable>;

  /**
   * @param statusCode - Status code to return.
   * @param metadata - Metadata corresponding to the response (and data potentially).
   * @param data - Data that needs to be returned. @ignored
   */
  public constructor(statusCode: number, metadata?: RepresentationMetadata, data?: Guarded<Readable>) {
    this.statusCode = statusCode;
    this.metadata = metadata;
    this.data = data;
  }
}
