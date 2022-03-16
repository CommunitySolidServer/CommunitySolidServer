import { InternalServerError } from '../../../util/errors/InternalServerError';
import { ensureTrailingSlash, joinUrl } from '../../../util/PathUtil';
import type { InteractionRoute } from './InteractionRoute';

/**
 * An {@link InteractionRoute} for routes that have a dynamic identifier in their path.
 */
export class IdInteractionRoute<TBase extends string, TId extends string> implements InteractionRoute<TBase | TId> {
  private readonly base: InteractionRoute<TBase>;
  private readonly idName: TId;
  private readonly ensureSlash: boolean;

  public constructor(base: InteractionRoute<TBase>, idName: TId, ensureSlash = true) {
    this.base = base;
    this.idName = idName;
    this.ensureSlash = ensureSlash;
  }

  public getPath(parameters?: Record<TBase | TId, string>): string {
    const id = parameters?.[this.idName];
    if (!id) {
      throw new InternalServerError(`Missing ${this.idName} from getPath call. This implies a misconfigured path.`);
    }

    const path = this.base.getPath(parameters);
    return joinUrl(path, this.ensureSlash ? ensureTrailingSlash(id) : id);
  }

  public matchPath(path: string): Record<TBase | TId, string> | undefined {
    const match = /(.*\/)([^/]+)\/$/u.exec(path);

    if (!match) {
      return;
    }

    const id = match[2];
    const head = match[1];

    const baseParameters = this.base.matchPath(head);

    if (!baseParameters) {
      return;
    }

    // Cast needed because TS always assumes type is { [x: string]: string; } when using [] like this
    // https://github.com/microsoft/TypeScript/issues/13948
    return { ...baseParameters, [this.idName]: id } as Record<TBase | TId, string>;
  }
}
