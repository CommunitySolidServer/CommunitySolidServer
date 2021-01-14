import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import type { HttpHandler, HttpHandlerInput } from '../HttpHandler';
import { RouterHanlder } from './RouterHandler';

export class GetPostRouterHandler extends RouterHanlder {
  private readonly getHandler: HttpHandler;
  private readonly postHanlder: HttpHandler;

  public constructor(
    pathname: string,
    getHandler: HttpHandler,
    postHandler: HttpHandler,
  ) {
    super(getHandler, [ 'GET', 'POST' ], [ pathname ]);
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
