import type { TargetExtractor } from '../../http/input/identifier/TargetExtractor';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { ensureTrailingSlash, getRelativeUrl } from '../../util/PathUtil';
import type { HttpHandlerInput } from '../HttpHandler';
import { HttpHandler } from '../HttpHandler';

export interface RouterHandlerArgs {
  baseUrl: string;
  targetExtractor: TargetExtractor;
  handler: HttpHandler;
  allowedMethods: string[];
  allowedPathNames: string[];
}

/**
 * An HttpHandler that checks if a given method and path are satisfied
 * and allows its handler to be executed if so.
 *
 * If `allowedMethods` contains '*' it will match all methods.
 */
export class RouterHandler extends HttpHandler {
  private readonly baseUrl: string;
  private readonly targetExtractor: TargetExtractor;
  private readonly handler: HttpHandler;
  private readonly allowedMethods: string[];
  private readonly allMethods: boolean;
  private readonly allowedPathNamesRegEx: RegExp[];

  public constructor(args: RouterHandlerArgs) {
    super();
    this.baseUrl = ensureTrailingSlash(args.baseUrl);
    this.targetExtractor = args.targetExtractor;
    this.handler = args.handler;
    this.allowedMethods = args.allowedMethods;
    this.allMethods = args.allowedMethods.includes('*');
    this.allowedPathNamesRegEx = args.allowedPathNames.map((pn): RegExp => new RegExp(pn, 'u'));
  }

  public async canHandle(input: HttpHandlerInput): Promise<void> {
    const { request } = input;
    if (!request.url) {
      throw new BadRequestHttpError('Cannot handle request without a url');
    }
    if (!request.method) {
      throw new BadRequestHttpError('Cannot handle request without a method');
    }
    if (!this.allMethods && !this.allowedMethods.includes(request.method)) {
      throw new MethodNotAllowedHttpError(`${request.method} is not allowed.`);
    }
    const pathName = await getRelativeUrl(this.baseUrl, request, this.targetExtractor);
    if (!this.allowedPathNamesRegEx.some((regex): boolean => regex.test(pathName))) {
      throw new NotFoundHttpError(`Cannot handle route ${pathName}`);
    }
    await this.handler.canHandle(input);
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    await this.handler.handle(input);
  }
}
