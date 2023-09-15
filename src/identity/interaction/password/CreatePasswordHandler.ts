import { object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import { assertAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import { parseSchema, validateWithError } from '../YupUtil';
import type { PasswordIdRoute } from './util/PasswordIdRoute';
import type { PasswordStore } from './util/PasswordStore';

type OutType = { resource: string };

const inSchema = object({
  email: string().trim().email().required(),
  password: string().trim().min(1).required(),
});

/**
 * Handles the creation of email/password login combinations for an account.
 */
export class CreatePasswordHandler extends JsonInteractionHandler<OutType> implements JsonView {
  protected readonly logger = getLoggerFor(this);

  private readonly passwordStore: PasswordStore;
  private readonly passwordRoute: PasswordIdRoute;

  public constructor(passwordStore: PasswordStore, passwordRoute: PasswordIdRoute) {
    super();
    this.passwordStore = passwordStore;
    this.passwordRoute = passwordRoute;
  }

  public async getView({ accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    assertAccountId(accountId);
    const passwordLogins: Record<string, string> = {};
    for (const { id, email } of await this.passwordStore.findByAccount(accountId)) {
      passwordLogins[email] = this.passwordRoute.getPath({ accountId, passwordId: id });
    }
    return { json: { ...parseSchema(inSchema), passwordLogins }};
  }

  public async handle({ accountId, json }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    // Email will be in lowercase
    const { email, password } = await validateWithError(inSchema, json);
    assertAccountId(accountId);

    const passwordId = await this.passwordStore.create(email, accountId, password);
    const resource = this.passwordRoute.getPath({ accountId, passwordId });

    // If we ever want to add email verification this would have to be checked separately
    await this.passwordStore.confirmVerification(passwordId);

    return { json: { resource }};
  }
}
