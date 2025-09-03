import type { interactionPolicy } from 'oidc-provider';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

/**
 * Used to generate custom {@link interactionPolicy.Prompt}s.
 */
export abstract class PromptFactory extends AsyncHandler<interactionPolicy.DefaultPolicy> {}
