import type { Operation } from '../../../ldp/operations/Operation';
import type { Interaction, InteractionHandlerResult } from '../email-password/handler/InteractionHandler';

export type TemplatedInteractionResult<T extends InteractionHandlerResult = InteractionHandlerResult> = T & {
  templateFiles: Record<string, string>;
};

/**
 * Handles the routing behaviour for IDP handlers.
 */
export interface InteractionRoute {
  /**
   * Returns the control fields that should be added to response objects.
   * Keys are control names, values are relative URL paths.
   */
  getControls: () => Record<string, string>;

  /**
   * If this route supports the given path.
   * @param path - Relative URL path.
   * @param prompt - Session prompt if there is one.
   */
  supportsPath: (path: string, prompt?: string) => boolean;

  /**
   * Handles the given operation.
   * @param operation - Operation to handle.
   * @param oidcInteraction - Interaction if there is one.
   *
   * @returns InteractionHandlerResult appended with relevant template files.
   */
  handleOperation: (operation: Operation, oidcInteraction?: Interaction) => Promise<TemplatedInteractionResult>;
}
