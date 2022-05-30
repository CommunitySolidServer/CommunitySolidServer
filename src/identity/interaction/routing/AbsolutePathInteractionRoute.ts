import type { InteractionRoute } from './InteractionRoute';

/**
 * A route that returns the input string as path.
 */
export class AbsolutePathInteractionRoute implements InteractionRoute {
  private readonly path: string;

  public constructor(path: string) {
    this.path = path;
  }

  public getPath(): string {
    return this.path;
  }
}
