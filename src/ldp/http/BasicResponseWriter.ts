import { HttpResponse } from '../../server/HttpResponse';
import { DATA_TYPE_BINARY } from '../../util/ContentTypes';
import { HttpError } from '../../util/errors/HttpError';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { ResponseDescription } from '../operations/ResponseDescription';
import { ResponseWriter } from './ResponseWriter';

/**
 * Writes to an {@link HttpResponse} based on the incoming {@link ResponseDescription} or error.
 * Still needs a way to write correct status codes for successful operations.
 */
export class BasicResponseWriter extends ResponseWriter {
  public async canHandle(input: { response: HttpResponse; result: ResponseDescription | Error }): Promise<void> {
    if (!(input.result instanceof Error)) {
      const dataType = input.result.body?.dataType;
      if (dataType && dataType !== DATA_TYPE_BINARY) {
        throw new UnsupportedHttpError('Only binary results are supported.');
      }
    }
  }

  public async handle(input: { response: HttpResponse; result: ResponseDescription | Error }): Promise<void> {
    if (input.result instanceof Error) {
      let code = 500;
      if (input.result instanceof HttpError) {
        code = input.result.statusCode;
      }
      input.response.setHeader('content-type', 'text/plain');
      input.response.writeHead(code);
      input.response.end(`${input.result.name}: ${input.result.message}\n${input.result.stack}`);
    } else {
      input.response.setHeader('location', input.result.identifier.path);
      if (input.result.body) {
        const contentType = input.result.body.metadata.contentType ?? 'text/plain';
        input.response.setHeader('content-type', contentType);
        input.result.body.data.pipe(input.response);
      }

      input.response.writeHead(200);

      if (!input.result.body) {
        // If there is an input body the response will end once the input stream ends
        input.response.end();
      }
    }
  }
}
