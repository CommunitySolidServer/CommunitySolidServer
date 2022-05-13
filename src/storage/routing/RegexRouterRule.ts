import type { Representation } from '../../http/representation/Representation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { trimTrailingSlashes } from '../../util/PathUtil';
import type { ResourceStore } from '../ResourceStore';
import { RouterRule } from './RouterRule';

/**
 * Utility class to easily configure Regex to ResourceStore mappings in the config files.
 */
export class RegexRule {
  public readonly regex: RegExp;
  public readonly store: ResourceStore;

  public constructor(regex: string, store: ResourceStore) {
    this.regex = new RegExp(regex, 'u');
    this.store = store;
  }
}

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
  private readonly rules: RegexRule[];

  /**
   * The keys of the `storeMap` will be converted into actual RegExp objects that will be used for testing.
   */
  public constructor(base: string, rules: RegexRule[]) {
    super();
    this.base = trimTrailingSlashes(base);
    this.rules = rules;
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
    for (const { regex, store } of this.rules) {
      if (regex.test(path)) {
        return store;
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
