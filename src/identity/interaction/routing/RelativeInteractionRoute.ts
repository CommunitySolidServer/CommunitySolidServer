import { joinUrl } from '../../../util/PathUtil';
import type { InteractionHandler } from '../InteractionHandler';
import { BasicInteractionRoute } from './BasicInteractionRoute';
import type { InteractionRoute } from './InteractionRoute';

/**
 * A route that is relative to another route.
 * The relative path will be joined to the input base,
 * which can either be an absolute URL or an InteractionRoute of which the path will be used.
 * The source handler will be called for all operation requests
 */
export class RelativeInteractionRoute extends BasicInteractionRoute {
  public constructor(base: InteractionRoute | string, relativePath: string, source?: InteractionHandler) {
    const url = typeof base === 'string' ? base : base.getPath();
    const path = joinUrl(url, relativePath);
    super(path, source);
  }
}
