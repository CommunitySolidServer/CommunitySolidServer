import { object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import { ConflictHttpError } from '../../../util/errors/ConflictHttpError';
import type { AccountStore } from '../account/util/AccountStore';
import { addLoginEntry, getRequiredAccount } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import { parseSchema, validateWithError } from '../YupUtil';
import type { PasswordIdRoute } from './util/PasswordIdRoute';
import { PASSWORD_METHOD } from './util/PasswordStore';
import type { PasswordStore } from './util/PasswordStore';

type OutType = { resource: string };

const inSchema = object({
  // Store e-mail addresses in lower case
  email: string().trim().email().lowercase()
    .required(),
  password: string().trim().min(1).required(),
});

/**
 * Handles the creation of email/password login combinations for an account.
 */
export class CreatePasswordHandler extends JsonInteractionHandler<OutType> implements JsonView {
  protected readonly logger = getLoggerFor(this);

  private readonly passwordStore: PasswordStore;
  private readonly accountStore: AccountStore;
  private readonly passwordRoute: PasswordIdRoute;

  public constructor(passwordStore: PasswordStore, accountStore: AccountStore, passwordRoute: PasswordIdRoute) {
    super();
    this.passwordStore = passwordStore;
    this.accountStore = accountStore;
    this.passwordRoute = passwordRoute;
  }

  public async getView(): Promise<JsonRepresentation> {
    return { json: parseSchema(inSchema) };
  }

  public async handle({ accountId, json }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    const account = await getRequiredAccount(this.accountStore, accountId);

    // Email will be in lowercase
    const { email, password } = await validateWithError(inSchema, json);

    if (account.logins[PASSWORD_METHOD]?.[email]) {
      throw new ConflictHttpError('This account already has a login method for this e-mail address.');
    }

    const resource = this.passwordRoute.getPath({ accountId: account.id, passwordId: encodeURIComponent(email) });

    // We need to create the password entry first before trying to add it to the account,
    // otherwise it might be impossible to remove it from the account again since
    // you can't remove a login method from an account if it is the last one.
    await this.passwordStore.create(email, account.id, password);

    // If we ever want to add email verification this would have to be checked separately
    await this.passwordStore.confirmVerification(email);

    try {
      addLoginEntry(account, PASSWORD_METHOD, email, resource);
      await this.accountStore.update(account);
    } catch (error: unknown) {
      this.logger.warn(`Error while updating account ${account.id}, reverting operation.`);
      await this.passwordStore.delete(email);
      throw error;
    }

    return { json: { resource }};
  }
}
