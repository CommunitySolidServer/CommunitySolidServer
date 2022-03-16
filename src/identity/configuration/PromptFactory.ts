import type { interactionPolicy } from 'oidc-provider';

/**
 * Used to generate custom {@link interactionPolicy.Prompt}s.
 */
export interface PromptFactory {
  /**
   * Generates the new prompt.
   */
  getPrompt: () => interactionPolicy.Prompt;
}
