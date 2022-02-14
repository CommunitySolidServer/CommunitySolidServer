import { joinUrl } from '../../../util/PathUtil';
import { AbsolutePathInteractionRoute } from './AbsolutePathInteractionRoute';
import type { InteractionRoute } from './InteractionRoute';

/**
 * A route that is relative to another route.
 * The relative path will be joined to the input base,
 * which can either be an absolute URL or an InteractionRoute of which the path will be used.
 */
export class RelativePathInteractionRoute extends AbsolutePathInteractionRoute {
  public constructor(base: InteractionRoute | string, relativePath: string) {
    const url = typeof base === 'string' ? base : base.getPath();
    const path = joinUrl(url, relativePath);
    super(path);
  }
}
