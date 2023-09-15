import { object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import type { EmptyObject } from '../../../util/map/MapUtil';
import { parsePath, verifyAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import { parseSchema, validateWithError } from '../YupUtil';
import type { PasswordIdRoute } from './util/PasswordIdRoute';
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

  private readonly passwordStore: PasswordStore;
  private readonly passwordRoute: PasswordIdRoute;

  public constructor(passwordStore: PasswordStore, passwordRoute: PasswordIdRoute) {
    super();
    this.passwordStore = passwordStore;
    this.passwordRoute = passwordRoute;
  }

  public async getView(): Promise<JsonRepresentation> {
    return { json: parseSchema(inSchema) };
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation<EmptyObject>> {
    const { target, accountId, json } = input;

    const { oldPassword, newPassword } = await validateWithError(inSchema, json);
    const match = parsePath(this.passwordRoute, target.path);

    const login = await this.passwordStore.get(match.passwordId);
    verifyAccountId(accountId, login?.accountId);

    // Make sure the old password is correct
    try {
      await this.passwordStore.authenticate(login.email, oldPassword);
    } catch {
      this.logger.warn(`Invalid password when trying to reset for email ${login.email}`);
      throw new BadRequestHttpError('Old password is invalid.');
    }

    await this.passwordStore.update(match.passwordId, newPassword);

    return { json: {}};
  }
}
