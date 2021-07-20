import { TemplateHandler } from '../../../server/util/TemplateHandler';

export interface IdpRenderHandlerProps {
  errorMessage?: string;
  prefilled?: Record<string, any>;
}

/**
 * A special Render Handler that renders an IDP form.
 * Contains an error message if something was wrong and prefilled values for forms.
 */
export abstract class IdpRenderHandler extends TemplateHandler<IdpRenderHandlerProps> {}
