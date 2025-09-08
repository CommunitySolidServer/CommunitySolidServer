import type { AllClientMetadata } from 'oidc-provider';
import type { ArrayElement } from '../../../util/map/MapUtil';
import type { ProviderFactory } from '../../configuration/ProviderFactory';
import type { JsonRepresentation } from '../InteractionUtil';
import { assertOidcInteraction } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';

// Only extract specific fields to prevent leaking information
// Based on https://www.w3.org/ns/solid/oidc-context.jsonld
const CLIENT_KEYS = [
  'client_id',
  'client_uri',
  'logo_uri',
  'policy_uri',
  'client_name',
  'contacts',
  'grant_types',
  'scope',
] as const;

// Possible keys in client metadata
type KeyType = ArrayElement<typeof CLIENT_KEYS>;
// Possible values for client metadata
type ValType = AllClientMetadata[KeyType];
// Simplified to keep Components.js happy
type OutType = {
  client: Record<string, string | string[] | undefined>;
  webId?: string;
};

/**
 * Returns a JSON representation with metadata of the client that is requesting the OIDC interaction.
 */
export class ClientInfoHandler extends JsonInteractionHandler<OutType> {
  private readonly providerFactory: ProviderFactory;

  public constructor(providerFactory: ProviderFactory) {
    super();
    this.providerFactory = providerFactory;
  }

  public async handle({ oidcInteraction }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    assertOidcInteraction(oidcInteraction);
    const provider = await this.providerFactory.getProvider();
    const client = await provider.Client.find(oidcInteraction.params.client_id as string);
    const metadata: AllClientMetadata = client?.metadata() ?? {};

    const jsonLd = Object.fromEntries(
      CLIENT_KEYS.filter((key): boolean => key in metadata)
        .map((key): [ KeyType, ValType ] => [ key, metadata[key] ]),
      // eslint-disable-next-line ts/naming-convention
    ) as Record<KeyType, ValType> & { '@context': 'https://www.w3.org/ns/solid/oidc-context.jsonld' };
    jsonLd['@context'] = 'https://www.w3.org/ns/solid/oidc-context.jsonld';

    // Note: this is the `accountId` from the OIDC library, in which we store the WebID
    const webId = oidcInteraction?.session?.accountId;

    return { json: { client: jsonLd, webId }};
  }
}
