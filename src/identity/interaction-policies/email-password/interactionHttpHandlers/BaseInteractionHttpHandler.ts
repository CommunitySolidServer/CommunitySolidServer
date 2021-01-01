import { parse } from 'url';
import { MethodNotAllowedHttpError } from '../../../../util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../../util/errors/NotFoundHttpError';
import type {
  InteractionHttpHandlerInput,
} from '../../../InteractionHttpHandler';
import { InteractionHttpHandler } from '../../../InteractionHttpHandler';

export interface BaseInteractionHttpHandlerArgs {
  allowedMethods: string[];
  pathnamePostfix: string;
}

export abstract class BaseInteractionHttpHandler extends InteractionHttpHandler {
  private readonly allowedMethods: string[];
  private readonly pathnameRegex: RegExp;

  public constructor(args: BaseInteractionHttpHandlerArgs) {
    super();
    this.allowedMethods = args.allowedMethods;
    this.pathnameRegex = !args.pathnamePostfix ?
      /^(?:\/interaction\b)(?:\/[\w]+)$/u :
      new RegExp(
        `^(?:/interaction\b)(?:/[w]+)(?:/${args.pathnamePostfix}\b)$`,
        'u',
      );
  }

  public async canHandle(
    input: InteractionHttpHandlerInput,
  ): Promise<void> {
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
    if (!this.pathnameRegex.test(pathname)) {
      throw new NotFoundHttpError(`Cannot handle route ${pathname}`);
    }
  }
}
