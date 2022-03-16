import { object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import type { EmptyObject } from '../../../util/map/MapUtil';
import type { AccountStore } from '../account/util/AccountStore';
import { ensureResource, getRequiredAccount } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import { parseSchema, validateWithError } from '../YupUtil';
import { PASSWORD_METHOD } from './util/PasswordStore';
import type { PasswordStore } from './util/PasswordStore';

const inSchema = object({
  oldPassword: string().trim().min(1).required(),
  newPassword: string().trim().min(1).required(),
});

/**
 * Allows the password of a login to be updated.
 */
export class UpdatePasswordHandler extends JsonInteractionHandler<EmptyObject> implements JsonView {
  private readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly passwordStore: PasswordStore;

  public constructor(accountStore: AccountStore, passwordStore: PasswordStore) {
    super();
    this.accountStore = accountStore;
    this.passwordStore = passwordStore;
  }

  public async getView(): Promise<JsonRepresentation> {
    return { json: parseSchema(inSchema) };
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation<EmptyObject>> {
    const { target, accountId, json } = input;
    const account = await getRequiredAccount(this.accountStore, accountId);

    const email = ensureResource(account.logins[PASSWORD_METHOD], target.path);

    const { oldPassword, newPassword } = await validateWithError(inSchema, json);

    // Make sure the old password is correct
    try {
      await this.passwordStore.authenticate(email, oldPassword);
    } catch {
      this.logger.warn(`Invalid password when trying to reset for email ${email}`);
      throw new BadRequestHttpError('Old password is invalid.');
    }

    await this.passwordStore.update(email, newPassword);

    return { json: {}};
  }
}
