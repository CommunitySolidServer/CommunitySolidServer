import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { RegistrationResponse,
  RegistrationManager } from '../../../../src/identity/interaction/email-password/util/RegistrationManager';
import type { Initializer } from '../../../../src/init/Initializer';
import { SetupHandler } from '../../../../src/init/setup/SetupHandler';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { readJsonStream } from '../../../../src/util/StreamUtil';

describe('A SetupHandler', (): void => {
  let operation: Operation;
  let details: RegistrationResponse;
  let registrationManager: jest.Mocked<RegistrationManager>;
  let initializer: jest.Mocked<Initializer>;
  let handler: SetupHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'POST',
      target: { path: 'http://example.com/setup' },
      preferences: {},
      body: new BasicRepresentation(),
    };

    initializer = {
      handleSafe: jest.fn(),
    } as any;

    details = {
      email: 'alice@test.email',
      createWebId: true,
      register: true,
      createPod: true,
    };

    registrationManager = {
      validateInput: jest.fn((input): any => input),
      register: jest.fn().mockResolvedValue(details),
    } as any;

    handler = new SetupHandler({ registrationManager, initializer });
  });

  it('error if no Initializer is defined and initialization is requested.', async(): Promise<void> => {
    handler = new SetupHandler({});
    operation.body = new BasicRepresentation(JSON.stringify({ initialize: true }), 'application/json');
    await expect(handler.handle({ operation })).rejects.toThrow(NotImplementedHttpError);
  });

  it('error if no RegistrationManager is defined and registration is requested.', async(): Promise<void> => {
    handler = new SetupHandler({});
    operation.body = new BasicRepresentation(JSON.stringify({ registration: true }), 'application/json');
    await expect(handler.handle({ operation })).rejects.toThrow(NotImplementedHttpError);
  });

  it('calls the Initializer when requested.', async(): Promise<void> => {
    operation.body = new BasicRepresentation(JSON.stringify({ initialize: true }), 'application/json');
    const result = await handler.handle({ operation });
    await expect(readJsonStream(result.data)).resolves.toEqual({ initialize: true, registration: false });
    expect(result.metadata.contentType).toBe('application/json');
    expect(initializer.handleSafe).toHaveBeenCalledTimes(1);
    expect(registrationManager.validateInput).toHaveBeenCalledTimes(0);
    expect(registrationManager.register).toHaveBeenCalledTimes(0);
  });

  it('calls the RegistrationManager when requested.', async(): Promise<void> => {
    const body = { registration: true, email: 'test@example.com' };
    operation.body = new BasicRepresentation(JSON.stringify(body), 'application/json');
    const result = await handler.handle({ operation });
    await expect(readJsonStream(result.data)).resolves.toEqual({ initialize: false, registration: true, ...details });
    expect(result.metadata.contentType).toBe('application/json');
    expect(initializer.handleSafe).toHaveBeenCalledTimes(0);
    expect(registrationManager.validateInput).toHaveBeenCalledTimes(1);
    expect(registrationManager.register).toHaveBeenCalledTimes(1);
    expect(registrationManager.validateInput).toHaveBeenLastCalledWith(body, true);
    expect(registrationManager.register).toHaveBeenLastCalledWith(body, true);
  });

  it('defaults to an empty JSON body if no data is provided.', async(): Promise<void> => {
    operation.body = new BasicRepresentation();
    const result = await handler.handle({ operation });
    await expect(readJsonStream(result.data)).resolves.toEqual({ initialize: false, registration: false });
    expect(result.metadata.contentType).toBe('application/json');
    expect(initializer.handleSafe).toHaveBeenCalledTimes(0);
    expect(registrationManager.validateInput).toHaveBeenCalledTimes(0);
    expect(registrationManager.register).toHaveBeenCalledTimes(0);
  });
});
