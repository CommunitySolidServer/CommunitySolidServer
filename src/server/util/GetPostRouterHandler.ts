import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import type { HttpHandler, HttpHandlerInput } from '../HttpHandler';
import { RouterHandler } from './RouterHandler';

export class GetPostRouterHandler extends RouterHandler {
  private readonly getHandler: HttpHandler;
  private readonly postHandler: HttpHandler;

  public constructor(
    pathnames: string[],
    getHandler: HttpHandler,
    postHandler: HttpHandler,
  ) {
    super(postHandler, [ 'GET', 'POST' ], pathnames);
    this.getHandler = getHandler;
    this.postHandler = postHandler;
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    if (input.request.method === 'GET') {
      await this.getHandler.handle(input);
    } else if (input.request.method === 'POST') {
      await this.postHandler.handle(input);
    } else {
      throw new MethodNotAllowedHttpError(`Cannot ${input.request.method} to this route.`);
    }
  }
}
