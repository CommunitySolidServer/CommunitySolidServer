import { interactionPolicy } from 'oidc-provider';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import DefaultPolicy = interactionPolicy.DefaultPolicy;

/**
 * Used to generate custom {@link interactionPolicy.Prompt}s.
 */
export abstract class PromptFactory extends AsyncHandler<DefaultPolicy> {}
