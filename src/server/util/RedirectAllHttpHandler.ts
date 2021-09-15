import { RedirectResponseDescription } from '../../ldp/http/response/RedirectResponseDescription';
import type { ResponseWriter } from '../../ldp/http/ResponseWriter';
import type { TargetExtractor } from '../../ldp/http/TargetExtractor';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { getRelativeUrl, joinUrl } from '../../util/PathUtil';
import type { HttpHandlerInput } from '../HttpHandler';
import { HttpHandler } from '../HttpHandler';

export interface RedirectAllHttpHandlerArgs {
  baseUrl: string;
  target: string;
  targetExtractor: TargetExtractor;
  responseWriter: ResponseWriter;
}

/**
 * Will redirect all incoming requests to the given target.
 * In case the incoming request already has the correct target,
 * the `canHandle` call will reject the input.
 */
export class RedirectAllHttpHandler extends HttpHandler {
  private readonly baseUrl: string;
  private readonly target: string;
  private readonly targetExtractor: TargetExtractor;
  private readonly responseWriter: ResponseWriter;

  public constructor(args: RedirectAllHttpHandlerArgs) {
    super();
    this.baseUrl = args.baseUrl;
    this.target = args.target;
    this.targetExtractor = args.targetExtractor;
    this.responseWriter = args.responseWriter;
  }

  public async canHandle({ request }: HttpHandlerInput): Promise<void> {
    const target = await getRelativeUrl(this.baseUrl, request, this.targetExtractor);
    if (target === this.target) {
      throw new NotImplementedHttpError('Target is already correct.');
    }
  }

  public async handle({ response }: HttpHandlerInput): Promise<void> {
    const result = new RedirectResponseDescription(joinUrl(this.baseUrl, this.target));
    await this.responseWriter.handleSafe({ response, result });
  }
}
