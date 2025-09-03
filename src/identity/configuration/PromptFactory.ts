import { AsyncHandler } from 'asynchronous-handlers';
import type { interactionPolicy } from 'oidc-provider';

/**
 * Used to generate custom {@link interactionPolicy.Prompt}s.
 */
export abstract class PromptFactory extends AsyncHandler<interactionPolicy.DefaultPolicy> {}
