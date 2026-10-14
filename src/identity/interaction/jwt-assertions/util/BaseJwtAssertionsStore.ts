import { v4 } from 'uuid';
import { importJWK, SignJWT } from 'jose';
import { Initializer } from '../../../../init/Initializer';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { createErrorMessage } from '../../../../util/errors/ErrorUtil';
import { InternalServerError } from '../../../../util/errors/InternalServerError';
import { ACCOUNT_TYPE } from '../../account/util/LoginStorage';
import type { AccountLoginStorage } from '../../account/util/LoginStorage';
import type { JwkGenerator } from '../../../configuration/JwkGenerator';
import type { JwtAssertion, JwtAssertionsStore } from './JwtAssertionsStore';

export const JWT_ASSERTIONS_STORAGE_TYPE = 'jwtAssertions';
export const JWT_ASSERTIONS_STORAGE_DESCRIPTION = {
  client: 'string',
  agent: 'string',
  accountId: `id:${ACCOUNT_TYPE}`,
  assertion: 'string',
} as const;

/**
 * A {@link JwtAssertionsStore} that uses a {@link AccountLoginStorage} for storing the tokens.
 * Needs to be initialized before it can be used.
 */
export class BaseJwtAssertionsStore extends Initializer implements JwtAssertionsStore {
  private readonly logger = getLoggerFor(this);

  private readonly storage: AccountLoginStorage<{ [JWT_ASSERTIONS_STORAGE_TYPE]:
      typeof JWT_ASSERTIONS_STORAGE_DESCRIPTION; }>;

  private initialized = false;
  private readonly jwkGenerator: JwkGenerator;

  // Wrong typings to prevent Components.js typing issues
  public constructor(
    storage: AccountLoginStorage<Record<string, never>>,
    jwkGenerator: JwkGenerator,
  ) {
    super();
    this.storage = storage as unknown as typeof this.storage;
    this.jwkGenerator = jwkGenerator;
  }

  // Initialize the type definitions
  public async handle(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      await this.storage.defineType(JWT_ASSERTIONS_STORAGE_TYPE, JWT_ASSERTIONS_STORAGE_DESCRIPTION, false);
      await this.storage.createIndex(JWT_ASSERTIONS_STORAGE_TYPE, 'accountId');
      await this.storage.createIndex(JWT_ASSERTIONS_STORAGE_TYPE, 'assertion');
      this.initialized = true;
    } catch (cause: unknown) {
      throw new InternalServerError(
        `Error defining client credentials in storage: ${createErrorMessage(cause)}`,
        { cause },
      );
    }
  }

  public async get(id: string): Promise<JwtAssertion | undefined> {
    return this.storage.get(JWT_ASSERTIONS_STORAGE_TYPE, id);
  }

  public async findByJwt(assertion: string): Promise<JwtAssertion | undefined> {
    // TODO: clean up
    return (await this.storage.find(JWT_ASSERTIONS_STORAGE_TYPE, { assertion }))[0];
  }

  public async findByAccount(accountId: string): Promise<JwtAssertion[]> {
    return this.storage.find(JWT_ASSERTIONS_STORAGE_TYPE, { accountId });
  }

  public async create(clientId: string, webId: string, accountId: string): Promise<{ id: string; assertion: string }> {
    const privateKey = await this.jwkGenerator.getPrivateKey();

    const privateKeyObject = await importJWK(privateKey);

    // Make sure both header and proof have the same timestamp
    const time = Date.now();

    // Currently the spec does not define how the notification sender should identify.
    // The format used here has been chosen to be similar
    // to how ID tokens are described in the Solid-OIDC specification for consistency.
    const jti = v4();
    const assertion = await new SignJWT({
      client: clientId,
      agent: webId,
    }).setProtectedHeader({ alg: privateKey.alg })
      .setIssuedAt(time)
      // .setExpirationTime(time + duration)
      // .setAudience('token endpoint')
      .setJti(jti)
      .sign(privateKeyObject);

    this.logger.debug(
      `Creating client credentials token with ClientID ${clientId} for WebID ${webId} and account ${accountId}`,
    );

    const { id } = await this.storage.create(JWT_ASSERTIONS_STORAGE_TYPE, { accountId, client: clientId, agent: webId, assertion });
    return { id, assertion };
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting JWT assertion with ID ${id}`);
    return this.storage.delete(JWT_ASSERTIONS_STORAGE_TYPE, id);
  }
}
