import { HttpError } from '../../util/errors/HttpError';
import { HttpResponse } from '../../server/HttpResponse';
import { ResponseDescription } from '../operations/ResponseDescription';
import { ResponseWriter } from './ResponseWriter';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';

/**
 * Writes to an {@link HttpResponse} based on the incoming {@link ResponseDescription} or error.
 */
export class SimpleResponseWriter extends ResponseWriter {
  public async canHandle(input: { response: HttpResponse; description?: ResponseDescription; error?: Error }): Promise<void> {
    if (!input.description && !input.error) {
      throw new UnsupportedHttpError('Either a description or an error is required for output.');
    }
    if (input.description && input.description.body) {
      if (input.description.body.dataType !== 'binary' && input.description.body.dataType !== 'string') {
        throw new UnsupportedHttpError('Only string or binary results are supported.');
      }
    }
  }

  public async handle(input: { response: HttpResponse; description?: ResponseDescription; error?: Error }): Promise<void> {
    if (input.description) {
      input.response.setHeader('location', input.description.identifier.path);
      if (input.description.body) {
        if (input.description.body.metadata.contentType) {
          input.response.setHeader('content-type', input.description.body.metadata.contentType);
        }
        input.description.body.data.pipe(input.response);
      }

      input.response.writeHead(200);

      if (!input.description.body) {
        // If there is an input body the response will end once the input stream ends
        input.response.end();
      }
    } else {
      let code = 500;
      if (input.error instanceof HttpError) {
        code = input.error.statusCode;
      }
      input.response.writeHead(code);
      input.response.end(`${input.error.name}: ${input.error.message}\n${input.error.stack}`);
    }
  }
}
