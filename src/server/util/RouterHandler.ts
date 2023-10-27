import type { TargetExtractor } from '../../http/input/identifier/TargetExtractor';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import type { HttpHandler, HttpHandlerInput } from '../HttpHandler';
import { BaseRouterHandler } from './BaseRouterHandler';
import type { BaseRouterHandlerArgs } from './BaseRouterHandler';

export interface RouterHandlerArgs extends BaseRouterHandlerArgs<HttpHandler> {
  targetExtractor: TargetExtractor;
}

/**
 * A {@link BaseRouterHandler} for an {@link HttpHandler}.
 * Uses a {@link TargetExtractor} to generate the target identifier.
 */
export class RouterHandler extends BaseRouterHandler<HttpHandler> {
  private readonly targetExtractor: TargetExtractor;

  public constructor(args: RouterHandlerArgs) {
    super(args);
    this.targetExtractor = args.targetExtractor;
  }

  public async canHandle(input: HttpHandlerInput): Promise<void> {
    const { request } = input;
    if (!request.url) {
      throw new BadRequestHttpError('Cannot handle request without a url');
    }
    const target = await this.targetExtractor.handleSafe({ request });
    await super.canHandleInput(input, request.method ?? 'UNKNOWN', target);
  }
}
