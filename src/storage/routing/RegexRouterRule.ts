import type { Representation } from '../../http/representation/Representation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { trimTrailingSlashes } from '../../util/PathUtil';
import type { ResourceStore } from '../ResourceStore';
import { RouterRule } from './RouterRule';

/**
 * Routes requests to a store based on the path of the identifier.
 * The identifier will be stripped of the base URI after which regexes will be used to find the correct store.
 * The trailing slash of the base URI will still be present so the first character a regex can match would be that `/`.
 * This way regexes such as `/container/` can match containers in any position.
 *
 * In case none of the regexes match an error will be thrown.
 */
export class RegexRouterRule extends RouterRule {
  private readonly base: string;
  private readonly regexes: Map<RegExp, ResourceStore>;

  /**
   * The keys of the `storeMap` will be converted into actual RegExp objects that will be used for testing.
   */
  public constructor(base: string, storeMap: Record<string, ResourceStore>) {
    super();
    this.base = trimTrailingSlashes(base);
    this.regexes = new Map(Object.keys(storeMap).map((regex): [ RegExp, ResourceStore ] =>
      [ new RegExp(regex, 'u'), storeMap[regex] ]));
  }

  public async canHandle(input: { identifier: ResourceIdentifier; representation?: Representation }): Promise<void> {
    this.matchStore(input.identifier);
  }

  public async handle(input: { identifier: ResourceIdentifier }): Promise<ResourceStore> {
    return this.matchStore(input.identifier);
  }

  /**
   * Finds the store corresponding to the regex that matches the given identifier.
   * Throws an error if none is found.
   */
  private matchStore(identifier: ResourceIdentifier): ResourceStore {
    const path = this.toRelative(identifier);
    for (const regex of this.regexes.keys()) {
      if (regex.test(path)) {
        return this.regexes.get(regex)!;
      }
    }
    throw new NotImplementedHttpError(`No stored regexes match ${identifier.path}`);
  }

  /**
   * Strips the base of the identifier and throws an error if there is no overlap.
   */
  private toRelative(identifier: ResourceIdentifier): string {
    if (!identifier.path.startsWith(this.base)) {
      throw new BadRequestHttpError(`Identifiers need to start with ${this.base}`);
    }
    return identifier.path.slice(this.base.length);
  }
}
