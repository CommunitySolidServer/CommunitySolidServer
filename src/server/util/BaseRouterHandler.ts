import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import type { AsyncHandlerInput, AsyncHandlerOutput } from '../../util/handlers/AsyncHandler';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import { trimTrailingSlashes } from '../../util/PathUtil';

export interface BaseRouterHandlerArgs<T extends AsyncHandler<unknown, unknown>> {
  /**
   * The base URL of the server.
   * Not required if no value is provided for `allowedPathNames`.
   */
  baseUrl?: string;
  /**
   * The handler to call if all checks pass.
   */
  handler: T;
  /**
   * The allowed method(s). `*` can be used to indicate all methods are allowed.
   * Default is `[ '*' ]`.
   */
  allowedMethods?: string[];
  /**
   * Regular expression(s) used to match the target URL.
   * The base URl without trailing slash will be stripped of before applying the regular expressions,
   * so the input will always start with a `/`.
   * Default is `[ '.*' ]`.
   */
  allowedPathNames?: string[];
}

/**
 * Checks if a given method and path are satisfied and allows its handler to be executed if so.
 *
 * Implementations of this class should call `canHandleInput` in their `canHandle` call with the correct parameters.
 *
 * `canHandleInput` expects a ResourceIdentifier to indicate it expects the target to have been validated already.
 */
export abstract class BaseRouterHandler<T extends AsyncHandler<unknown, unknown>>
  extends AsyncHandler<AsyncHandlerInput<T>, AsyncHandlerOutput<T>> {
  protected readonly baseUrlLength: number;
  protected readonly handler: T;
  protected readonly allowedMethods: string[];
  protected readonly allMethods: boolean;
  protected readonly allowedPathNamesRegEx: RegExp[];

  protected constructor(args: BaseRouterHandlerArgs<T>) {
    super();
    if (typeof args.allowedPathNames !== 'undefined' && typeof args.baseUrl !== 'string') {
      throw new TypeError('A value for allowedPathNames requires baseUrl to be defined.');
    }
    // Trimming trailing slash so regexes can start with `/`
    this.baseUrlLength = trimTrailingSlashes(args.baseUrl ?? '').length;
    this.handler = args.handler;
    this.allowedMethods = args.allowedMethods ?? [ '*' ];
    this.allMethods = this.allowedMethods.includes('*');
    this.allowedPathNamesRegEx = (args.allowedPathNames ?? [ '.*' ]).map((pn): RegExp => new RegExp(pn, 'u'));
  }

  protected async canHandleInput(input: AsyncHandlerInput<T>, method: string, target: ResourceIdentifier):
  Promise<void> {
    if (!this.allMethods && !this.allowedMethods.includes(method)) {
      throw new MethodNotAllowedHttpError([ method ], `${method} is not allowed.`);
    }
    const pathName = target.path.slice(this.baseUrlLength);
    if (!this.allowedPathNamesRegEx.some((regex): boolean => regex.test(pathName))) {
      throw new NotFoundHttpError(`Cannot handle route ${pathName}`);
    }
    await this.handler.canHandle(input);
  }

  public async handle(input: AsyncHandlerInput<T>): Promise<AsyncHandlerOutput<T>> {
    return this.handler.handle(input) as Promise<AsyncHandlerOutput<T>>;
  }
}
