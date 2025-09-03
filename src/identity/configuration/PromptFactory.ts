// eslint-disable-next-line ts/ban-ts-comment, ts/prefer-ts-expect-error
// @ts-ignore
import type { interactionPolicy } from 'oidc-provider';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

/**
 * Used to generate custom {@link interactionPolicy.Prompt}s.
 */
export abstract class PromptFactory extends AsyncHandler<interactionPolicy.DefaultPolicy> {}
