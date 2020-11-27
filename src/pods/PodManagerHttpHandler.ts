import type { RequestParser } from '../ldp/http/RequestParser';
import { CreatedResponseDescription } from '../ldp/http/response/CreatedResponseDescription';
import type { ResponseWriter } from '../ldp/http/ResponseWriter';
import { HttpHandler } from '../server/HttpHandler';
import type { HttpRequest } from '../server/HttpRequest';
import type { HttpResponse } from '../server/HttpResponse';
import { BadRequestHttpError } from '../util/errors/BadRequestHttpError';
import { InternalServerError } from '../util/errors/InternalServerError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { AgentParser } from './agent/AgentParser';
import type { PodManager } from './PodManager';

export interface PodHttpHandlerArgs {
  /** The path on which this handler should intercept requests. Should start with a slash. */
  requestPath: string;
  /** Parses the incoming request. */
  requestParser: RequestParser;
  /** Parses the data stream to an Agent. */
  agentParser: AgentParser;
  /** Handles the pod management. */
  manager: PodManager;
  /** Writes the outgoing response. */
  responseWriter: ResponseWriter;
}

/**
 * An HTTP handler that listens to requests to a specific path for pod related requests.
 * Handles everything related to pod management from input request to output response.
 */
export class PodManagerHttpHandler extends HttpHandler {
  private readonly requestPath!: string;
  private readonly requestParser!: RequestParser;
  private readonly agentParser!: AgentParser;
  private readonly manager!: PodManager;
  private readonly responseWriter!: ResponseWriter;

  public constructor(args: PodHttpHandlerArgs) {
    super();
    Object.assign(this, args);
  }

  public async canHandle({ request }: { request: HttpRequest }): Promise<void> {
    if (request.url !== this.requestPath) {
      throw new NotImplementedHttpError(`Only requests to ${this.requestPath} are accepted`);
    }
  }

  public async handle({ request, response }: { request: HttpRequest; response: HttpResponse }): Promise<void> {
    try {
      if (request.method !== 'POST') {
        throw new NotImplementedHttpError('Only POST requests are supported');
      }
      const op = await this.requestParser.handleSafe(request);
      if (!op.body) {
        throw new BadRequestHttpError('A body is required to create a pod');
      }
      const agent = await this.agentParser.handleSafe(op.body);
      const id = await this.manager.createPod(agent);

      await this.responseWriter.handleSafe({ response, result: new CreatedResponseDescription(id) });
    } catch (error: unknown) {
      if (error instanceof Error) {
        await this.responseWriter.handleSafe({ response, result: error });
      } else {
        await this.responseWriter.handleSafe({ response, result: new InternalServerError('Unexpected error') });
      }
    }
  }
}
