import { RenderHandler } from '../../../server/util/RenderHandler';

export interface IdpRenderhandlerProps {
  details: {
    uid: string;
  };
  errorMessage: string;
  prefilled: Record<string, any>;
}

export abstract class IdpRenderHandler extends RenderHandler<IdpRenderhandlerProps> {}
