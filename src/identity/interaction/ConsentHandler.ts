import type {
  AllClientMetadata,
  InteractionResults,
  KoaContextWithOIDC,
  UnknownObject,
} from '../../../templates/types/oidc-provider';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { FoundHttpError } from '../../util/errors/FoundHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { readJsonStream } from '../../util/StreamUtil';
import type { ProviderFactory } from '../configuration/ProviderFactory';
import { BaseInteractionHandler } from './BaseInteractionHandler';
import type { Interaction, InteractionHandlerInput } from './InteractionHandler';

type Grant = NonNullable<KoaContextWithOIDC['oidc']['entities']['Grant']>;

/**
 * Handles the OIDC consent prompts where the user confirms they want to log in for the given client.
 *
 * Returns all the relevant Client metadata on GET requests.
 */
export class ConsentHandler extends BaseInteractionHandler {
  private readonly providerFactory: ProviderFactory;

  public constructor(providerFactory: ProviderFactory) {
    super({});
    this.providerFactory = providerFactory;
  }

  public async canHandle(input: InteractionHandlerInput): Promise<void> {
    await super.canHandle(input);
    if (input.operation.method === 'POST' && !input.oidcInteraction) {
      throw new BadRequestHttpError(
        'This action can only be performed as part of an OIDC authentication flow.',
        { errorCode: 'E0002' },
      );
    }
  }

  protected async handleGet(input: Required<InteractionHandlerInput>): Promise<Representation> {
    const { operation, oidcInteraction } = input;
    const provider = await this.providerFactory.getProvider();
    const client = await provider.Client.find(oidcInteraction.params.client_id as string);
    const metadata: AllClientMetadata = client?.metadata() ?? {};

    // Only extract specific fields to prevent leaking information
    // Based on https://www.w3.org/ns/solid/oidc-context.jsonld
    const keys = [ 'client_id', 'client_uri', 'logo_uri', 'policy_uri',
      'client_name', 'contacts', 'grant_types', 'scope' ];

    const jsonLd = Object.fromEntries(
      keys.filter((key): boolean => key in metadata)
        .map((key): [ string, unknown ] => [ key, metadata[key] ]),
    );
    jsonLd['@context'] = 'https://www.w3.org/ns/solid/oidc-context.jsonld';
    const json = { webId: oidcInteraction.session?.accountId, client: jsonLd };

    return new BasicRepresentation(JSON.stringify(json), operation.target, APPLICATION_JSON);
  }

  protected async handlePost({ operation, oidcInteraction }: InteractionHandlerInput): Promise<never> {
    const { remember, logOut } = await readJsonStream(operation.body.data);

    if (logOut) {
      const provider = await this.providerFactory.getProvider();
      const session = (await provider.Session.find(oidcInteraction!.session!.cookie))!;
      delete session.accountId;
      await session.save(session.exp - Math.floor(Date.now() / 1000));

      throw new FoundHttpError(oidcInteraction!.returnTo);
    }

    const grant = await this.getGrant(oidcInteraction!);
    this.updateGrant(grant, oidcInteraction!.prompt.details, remember);

    const location = await this.updateInteraction(oidcInteraction!, grant);

    throw new FoundHttpError(location);
  }

  /**
   * Either returns the grant associated with the given interaction or creates a new one if it does not exist yet.
   */
  private async getGrant(oidcInteraction: Interaction): Promise<Grant> {
    if (!oidcInteraction.session) {
      throw new NotImplementedHttpError('Only interactions with a valid session are supported.');
    }

    const { params, session: { accountId }, grantId } = oidcInteraction;
    const provider = await this.providerFactory.getProvider();
    let grant: Grant;
    if (grantId) {
      grant = (await provider.Grant.find(grantId))!;
    } else {
      grant = new provider.Grant({
        accountId,
        clientId: params.client_id as string,
      });
    }
    return grant;
  }

  /**
   * Updates the grant with all the missing scopes and claims requested by the interaction.
   *
   * Will reject the `offline_access` scope if `remember` is false.
   */
  private updateGrant(grant: Grant, details: UnknownObject, remember: boolean): void {
    // Reject the offline_access scope if the user does not want to be remembered
    if (!remember) {
      grant.rejectOIDCScope('offline_access');
    }

    // Grant all the requested scopes and claims
    if (details.missingOIDCScope) {
      grant.addOIDCScope((details.missingOIDCScope as string[]).join(' '));
    }
    if (details.missingOIDCClaims) {
      grant.addOIDCClaims(details.missingOIDCClaims as string[]);
    }
    if (details.missingResourceScopes) {
      for (const [ indicator, scopes ] of Object.entries(details.missingResourceScopes as Record<string, string[]>)) {
        grant.addResourceScope(indicator, scopes.join(' '));
      }
    }
  }

  /**
   * Updates the interaction with the new grant and returns the resulting redirect URL.
   */
  private async updateInteraction(oidcInteraction: Interaction, grant: Grant): Promise<string> {
    const grantId = await grant.save();

    const consent: InteractionResults['consent'] = {};
    // Only need to update the grantId if it is new
    if (!oidcInteraction.grantId) {
      consent.grantId = grantId;
    }

    const result: InteractionResults = { consent };

    // Need to merge with previous submission
    oidcInteraction.result = { ...oidcInteraction.lastSubmission, ...result };
    await oidcInteraction.save(oidcInteraction.exp - Math.floor(Date.now() / 1000));

    return oidcInteraction.returnTo;
  }
}
