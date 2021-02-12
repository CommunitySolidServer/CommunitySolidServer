import { parse } from 'url';
import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import type { HttpHandlerInput } from '../HttpHandler';
import { HttpHandler } from '../HttpHandler';

export class RouterHandler extends HttpHandler {
  protected readonly handler: HttpHandler;
  protected readonly allowedMethods: string[];
  protected readonly allowedPathnamesRegEx: RegExp[];

  public constructor(
    handler: HttpHandler,
    allowedMethods: string[],
    allowedPathnames: string[],
  ) {
    super();
    this.handler = handler;
    this.allowedMethods = allowedMethods;
    this.allowedPathnamesRegEx = allowedPathnames.map((pn): RegExp => new RegExp(pn, 'u'));
  }

  public async canHandle(input: HttpHandlerInput): Promise<void> {
    if (!input.request.url) {
      throw new Error('Cannot handle request without a url');
    }
    if (!input.request.method) {
      throw new Error('Cannot handle request without a method');
    }
    if (
      !this.allowedMethods.some(
        (method): boolean => method === input.request.method,
      )
    ) {
      throw new MethodNotAllowedHttpError(
        `${input.request.method} is not allowed.`,
      );
    }
    const { pathname } = parse(input.request.url);
    if (!pathname) {
      throw new Error('Cannot handle request without pathname');
    }
    if (!this.allowedPathnamesRegEx.some((regex): boolean => regex.test(pathname))) {
      throw new NotFoundHttpError(`Cannot handle route ${pathname}`);
    }
    await this.handler.canHandle(input);
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    await this.handler.handle(input);
  }
}
