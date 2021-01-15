import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import type { HttpHandler, HttpHandlerInput } from '../HttpHandler';
import { RouterHandler } from './RouterHandler';

export class GetPostRouterHandler extends RouterHandler {
  private readonly getHandler: HttpHandler;
  private readonly postHanlder: HttpHandler;

  public constructor(
    pathnames: string[],
    getHandler: HttpHandler,
    postHandler: HttpHandler,
  ) {
    super(postHandler, [ 'GET', 'POST' ], pathnames);
    this.getHandler = getHandler;
    this.postHanlder = postHandler;
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    if (input.request.method === 'GET') {
      await this.getHandler.handle(input);
    } else if (input.request.method === 'POST') {
      await this.postHanlder.handle(input);
    } else {
      throw new NotFoundHttpError(`Cannot ${input.request.method} to this route.`);
    }
  }
}
