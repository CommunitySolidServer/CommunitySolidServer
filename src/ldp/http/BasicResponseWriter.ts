import { getLoggerFor } from '../../logging/LogUtil';
import type { HttpResponse } from '../../server/HttpResponse';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { pipeSafely } from '../../util/StreamUtil';
import type { MetadataWriter } from './metadata/MetadataWriter';
import type { ResponseDescription } from './response/ResponseDescription';
import { ResponseWriter } from './ResponseWriter';

/**
 * Writes to an {@link HttpResponse} based on the incoming {@link ResponseDescription}.
 */
export class BasicResponseWriter extends ResponseWriter {
  protected readonly logger = getLoggerFor(this);
  private readonly metadataWriter: MetadataWriter;

  public constructor(metadataWriter: MetadataWriter) {
    super();
    this.metadataWriter = metadataWriter;
  }

  public async canHandle(input: { response: HttpResponse; result: ResponseDescription | Error }): Promise<void> {
    if (input.result instanceof Error || input.result.metadata?.contentType === INTERNAL_QUADS) {
      this.logger.warn('This writer only supports binary ResponseDescriptions');
      throw new NotImplementedHttpError('Only successful binary responses are supported');
    }
  }

  public async handle(input: { response: HttpResponse; result: ResponseDescription }): Promise<void> {
    if (input.result.metadata) {
      await this.metadataWriter.handleSafe({ response: input.response, metadata: input.result.metadata });
    }

    input.response.writeHead(input.result.statusCode);

    if (input.result.data) {
      const pipe = pipeSafely(input.result.data, input.response);
      pipe.on('error', (error): void => {
        this.logger.error(`Writing to HttpResponse failed with message ${error.message}`);
      });
    } else {
      // If there is input data the response will end once the input stream ends
      input.response.end();
    }
  }
}
