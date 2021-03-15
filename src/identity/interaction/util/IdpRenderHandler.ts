import { RenderHandler } from '../../../server/util/RenderHandler';

export interface IdpRenderHandlerProps {
  details: {
    uid: string;
  };
  errorMessage: string;
  prefilled: Record<string, any>;
}

/**
 * A special Render Handler that renders an Idp form
 */
export abstract class IdpRenderHandler extends RenderHandler<IdpRenderHandlerProps> {}
