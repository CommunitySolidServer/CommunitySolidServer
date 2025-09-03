import { getLoggerFor } from 'global-logger-factory';
import type { InteractionResults } from 'oidc-provider';
import type Provider from 'oidc-provider';
import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import type { Json } from '../../util/Json';
import type { Interaction } from './InteractionHandler';
import Dict = NodeJS.Dict;

const logger = getLoggerFor('AccountUtil');

/**
 * Contains a JSON object and any associated metadata.
 * Similar to a {@link Representation} but with all the data in memory instead of as a stream
 * and specific to JSON.
 */
export interface JsonRepresentation<T extends Dict<Json> = Dict<Json>> {
  json: T;
  metadata?: RepresentationMetadata;
}

/**
 * Asserts `oidcInteraction` is defined, throws the correct error in case this is not the case.
 * The error contains the relevant error code that can be used to explain more extensively what the issue is
 * and why an OIDC interaction is needed.
 *
 * @param oidcInteraction - Interaction object to check.
 */
export function assertOidcInteraction(oidcInteraction?: Interaction): asserts oidcInteraction is Interaction {
  if (!oidcInteraction) {
    logger.warn(`Trying to perform OIDC operation without being in an OIDC authentication flow`);
    throw new BadRequestHttpError(
      'This action can only be performed as part of an OIDC authentication flow.',
      { errorCode: 'E0002' },
    );
  }
}

/**
 * The prompt that is used to track the account ID of a user during an OIDC interaction.
 * The already existing `login` prompt in the {@link InteractionResults}
 * is used to track the WebID that is chosen in an OIDC interaction.
 */
export const ACCOUNT_PROMPT = 'account';
/**
 * {@link InteractionResults} extended with our custom key for tracking a user's account ID.
 */
export type AccountInteractionResults = { [ACCOUNT_PROMPT]?: string } & InteractionResults;

/**
 * Updates the `oidcInteraction` object with the necessary data in case a prompt gets updated.
 *
 * @param oidcInteraction - Interaction to update.
 * @param result - New data to add to the interaction.
 * @param mergeWithLastSubmission - If this new data needs to be merged with already existing data in the interaction.
 */
export async function finishInteraction(
  oidcInteraction: Interaction,
  result: AccountInteractionResults,
  mergeWithLastSubmission: boolean,
): Promise<string> {
  if (mergeWithLastSubmission) {
    result = { ...oidcInteraction.lastSubmission, ...result };
  }

  oidcInteraction.result = result;
  await oidcInteraction.persist();

  return oidcInteraction.returnTo;
}

/**
 * Removes the WebID, the `accountId`, from the OIDC session object,
 * allowing us to replace it with a new value.
 * If there is no session in the Interaction, nothing will happen.
 *
 * @param provider - The OIDC provider.
 * @param oidcInteraction - The current interaction.
 */
export async function forgetWebId(provider: Provider, oidcInteraction: Interaction): Promise<void> {
  if (oidcInteraction.session) {
    const session = (await provider.Session.find(oidcInteraction.session.cookie))!;
    logger.debug(`Forgetting WebID ${session.accountId} in active session`);
    delete session.accountId;
    await session.persist();
  }

  // If a client previously successfully completed an interaction, a grant will have been created.
  // If such a session is reused to authenticate with a different WebID, we need to
  // first delete the previously created grant, as the oidc-provider will try to reuse it as well.
  if (oidcInteraction.grantId) {
    const grant = await provider.Grant.find(oidcInteraction.grantId);
    await grant?.destroy();
  }
}
