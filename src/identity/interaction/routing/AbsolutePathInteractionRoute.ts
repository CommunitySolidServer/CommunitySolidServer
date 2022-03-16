import type { EmptyObject } from '../../../util/map/MapUtil';
import { ensureTrailingSlash } from '../../../util/PathUtil';
import type { InteractionRoute } from './InteractionRoute';

/**
 * A route that stores a single absolute path.
 */
export class AbsolutePathInteractionRoute implements InteractionRoute {
  private readonly path: string;

  public constructor(path: string, ensureSlash = true) {
    this.path = path;
    if (ensureSlash) {
      this.path = ensureTrailingSlash(this.path);
    }
  }

  public getPath(): string {
    return this.path;
  }

  public matchPath(path: string): EmptyObject | undefined {
    if (path === this.path) {
      return {};
    }
  }
}
