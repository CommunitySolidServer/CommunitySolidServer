import {
  RegistrationHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/RegistrationHandler';
import type {
  RegistrationManager, RegistrationParams, RegistrationResponse,
} from '../../../../../../src/identity/interaction/email-password/util/RegistrationManager';
import type { Operation } from '../../../../../../src/ldp/operations/Operation';
import { createPostJsonOperation } from './Util';

describe('A RegistrationHandler', (): void => {
  let operation: Operation;
  let validated: RegistrationParams;
  let details: RegistrationResponse;
  let registrationManager: jest.Mocked<RegistrationManager>;
  let handler: RegistrationHandler;

  beforeEach(async(): Promise<void> => {
    validated = {
      email: 'alice@test.email',
      password: 'superSecret',
      createWebId: true,
      register: true,
      createPod: true,
      rootPod: true,
    };
    details = {
      email: 'alice@test.email',
      createWebId: true,
      register: true,
      createPod: true,
    };

    registrationManager = {
      validateInput: jest.fn().mockReturnValue(validated),
      register: jest.fn().mockResolvedValue(details),
    } as any;

    handler = new RegistrationHandler(registrationManager);
  });

  it('converts the stream to json and sends it to the registration manager.', async(): Promise<void> => {
    const params = { email: 'alice@test.email', password: 'superSecret' };
    operation = createPostJsonOperation(params);
    await expect(handler.handle({ operation })).resolves.toEqual({
      type: 'response',
      details,
    });

    expect(registrationManager.validateInput).toHaveBeenCalledTimes(1);
    expect(registrationManager.validateInput).toHaveBeenLastCalledWith(params, false);
    expect(registrationManager.register).toHaveBeenCalledTimes(1);
    expect(registrationManager.register).toHaveBeenLastCalledWith(validated, false);
  });
});
