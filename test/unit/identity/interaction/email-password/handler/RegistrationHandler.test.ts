import {
  RegistrationHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/RegistrationHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import { IdpInteractionError } from '../../../../../../src/identity/interaction/util/IdpInteractionError';
import type { OwnershipValidator } from '../../../../../../src/identity/ownership/OwnershipValidator';
import type { Operation } from '../../../../../../src/ldp/operations/Operation';
import type { ResourceIdentifier } from '../../../../../../src/ldp/representation/ResourceIdentifier';
import type { IdentifierGenerator } from '../../../../../../src/pods/generate/IdentifierGenerator';
import type { PodManager } from '../../../../../../src/pods/PodManager';
import type { PodSettings } from '../../../../../../src/pods/settings/PodSettings';
import { joinUrl } from '../../../../../../src/util/PathUtil';
import { createPostJsonOperation } from './Util';

describe('A RegistrationHandler', (): void => {
  // "Correct" values for easy object creation
  const webId = 'http://alice.test.com/card#me';
  const email = 'alice@test.email';
  const password = 'superSecretPassword';
  const confirmPassword = password;
  const podName = 'alice';
  const podBaseUrl = 'http://test.com/alice/';
  const createWebId = true;
  const register = true;
  const createPod = true;

  let operation: Operation;

  const baseUrl = 'http://test.com/';
  const webIdSuffix = '/profile/card';
  let podSettings: PodSettings;
  let identifierGenerator: IdentifierGenerator;
  let ownershipValidator: OwnershipValidator;
  let accountStore: AccountStore;
  let podManager: PodManager;
  let handler: RegistrationHandler;

  beforeEach(async(): Promise<void> => {
    podSettings = { email, webId, podBaseUrl };

    identifierGenerator = {
      generate: jest.fn((name: string): ResourceIdentifier => ({ path: `${baseUrl}${name}/` })),
    };

    ownershipValidator = {
      handleSafe: jest.fn(),
    } as any;

    accountStore = {
      create: jest.fn(),
      verify: jest.fn(),
      deleteAccount: jest.fn(),
    } as any;

    podManager = {
      createPod: jest.fn(),
    };

    handler = new RegistrationHandler({
      baseUrl,
      webIdSuffix,
      identifierGenerator,
      accountStore,
      ownershipValidator,
      podManager,
    });
  });

  describe('validating data', (): void => {
    it('rejects array inputs.', async(): Promise<void> => {
      operation = createPostJsonOperation({ mydata: [ 'a', 'b' ]});
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Unexpected multiple values for mydata.');
    });

    it('errors on invalid emails.', async(): Promise<void> => {
      operation = createPostJsonOperation({ email: undefined });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Please enter a valid e-mail address.');

      operation = createPostJsonOperation({ email: '' });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Please enter a valid e-mail address.');

      operation = createPostJsonOperation({ email: 'invalidEmail' });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Please enter a valid e-mail address.');
    });

    it('errors when a required WebID is not valid.', async(): Promise<void> => {
      operation = createPostJsonOperation({ email, register, webId: undefined });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Please enter a valid WebID.');

      operation = createPostJsonOperation({ email, register, webId: '' });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Please enter a valid WebID.');
    });

    it('errors on invalid passwords when registering.', async(): Promise<void> => {
      operation = createPostJsonOperation({ email, webId, password, confirmPassword: 'bad', register });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Your password and confirmation did not match.');
    });

    it('errors on invalid pod names when required.', async(): Promise<void> => {
      operation = createPostJsonOperation({ email, webId, createPod, podName: undefined });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Please specify a Pod name.');

      operation = createPostJsonOperation({ email, webId, createPod, podName: ' ' });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Please specify a Pod name.');

      operation = createPostJsonOperation({ email, webId, createWebId });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Please specify a Pod name.');
    });

    it('errors when trying to create a WebID without registering or creating a pod.', async(): Promise<void> => {
      operation = createPostJsonOperation({ email, podName, createWebId });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Please enter a password.');

      operation = createPostJsonOperation({ email, podName, createWebId, createPod });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Please enter a password.');

      operation = createPostJsonOperation({ email, podName, createWebId, createPod, register });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Please enter a password.');
    });

    it('errors when no option is chosen.', async(): Promise<void> => {
      operation = createPostJsonOperation({ email, webId });
      await expect(handler.handle({ operation }))
        .rejects.toThrow('Please register for a WebID or create a Pod.');
    });
  });

  describe('handling data', (): void => {
    it('can register a user.', async(): Promise<void> => {
      operation = createPostJsonOperation({ email, webId, password, confirmPassword, register });
      await expect(handler.handle({ operation })).resolves.toEqual({
        details: {
          email,
          webId,
          oidcIssuer: baseUrl,
          createWebId: false,
          register: true,
          createPod: false,
        },
        type: 'response',
      });

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email, webId, password);
      expect(accountStore.verify).toHaveBeenCalledTimes(1);
      expect(accountStore.verify).toHaveBeenLastCalledWith(email);

      expect(identifierGenerator.generate).toHaveBeenCalledTimes(0);
      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
      expect(podManager.createPod).toHaveBeenCalledTimes(0);
    });

    it('can create a pod.', async(): Promise<void> => {
      const params = { email, webId, podName, createPod };
      operation = createPostJsonOperation(params);
      await expect(handler.handle({ operation })).resolves.toEqual({
        details: {
          email,
          webId,
          oidcIssuer: baseUrl,
          podBaseUrl: `${baseUrl}${podName}/`,
          createWebId: false,
          register: false,
          createPod: true,
        },
        type: 'response',
      });

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
      expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
      expect(identifierGenerator.generate).toHaveBeenLastCalledWith(podName);
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith({ path: `${baseUrl}${podName}/` }, podSettings);

      expect(accountStore.create).toHaveBeenCalledTimes(0);
      expect(accountStore.verify).toHaveBeenCalledTimes(0);
      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
    });

    it('adds an oidcIssuer to the data when doing both IDP registration and pod creation.', async(): Promise<void> => {
      const params = { email, webId, password, confirmPassword, podName, register, createPod };
      podSettings.oidcIssuer = baseUrl;
      operation = createPostJsonOperation(params);
      await expect(handler.handle({ operation })).resolves.toEqual({
        details: {
          email,
          webId,
          oidcIssuer: baseUrl,
          podBaseUrl: `${baseUrl}${podName}/`,
          createWebId: false,
          register: true,
          createPod: true,
        },
        type: 'response',
      });

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email, webId, password);
      expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
      expect(identifierGenerator.generate).toHaveBeenLastCalledWith(podName);
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith({ path: `${baseUrl}${podName}/` }, podSettings);
      expect(accountStore.verify).toHaveBeenCalledTimes(1);
      expect(accountStore.verify).toHaveBeenLastCalledWith(email);

      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
    });

    it('deletes the created account if pod generation fails.', async(): Promise<void> => {
      const params = { email, webId, password, confirmPassword, podName, register, createPod };
      podSettings.oidcIssuer = baseUrl;
      operation = createPostJsonOperation(params);
      (podManager.createPod as jest.Mock).mockRejectedValueOnce(new Error('pod error'));
      await expect(handler.handle({ operation })).rejects.toThrow('pod error');

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email, webId, password);
      expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
      expect(identifierGenerator.generate).toHaveBeenLastCalledWith(podName);
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith({ path: `${baseUrl}${podName}/` }, podSettings);
      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(1);
      expect(accountStore.deleteAccount).toHaveBeenLastCalledWith(email);

      expect(accountStore.verify).toHaveBeenCalledTimes(0);
    });

    it('can create a WebID with an account and pod.', async(): Promise<void> => {
      const params = { email, password, confirmPassword, podName, createWebId, register, createPod };
      const generatedWebID = joinUrl(baseUrl, podName, webIdSuffix);
      podSettings.webId = generatedWebID;
      podSettings.oidcIssuer = baseUrl;

      operation = createPostJsonOperation(params);
      await expect(handler.handle({ operation })).resolves.toEqual({
        details: {
          email,
          webId: generatedWebID,
          oidcIssuer: baseUrl,
          podBaseUrl: `${baseUrl}${podName}/`,
          createWebId: true,
          register: true,
          createPod: true,
        },
        type: 'response',
      });

      expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
      expect(identifierGenerator.generate).toHaveBeenLastCalledWith(podName);
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email, generatedWebID, password);
      expect(accountStore.verify).toHaveBeenCalledTimes(1);
      expect(accountStore.verify).toHaveBeenLastCalledWith(email);
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith({ path: `${baseUrl}${podName}/` }, podSettings);

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(0);
      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
    });

    it('throws an IdpInteractionError with all data prefilled if something goes wrong.', async(): Promise<void> => {
      const params = { email, webId, podName, createPod };
      operation = createPostJsonOperation(params);
      (podManager.createPod as jest.Mock).mockRejectedValueOnce(new Error('pod error'));
      const prom = handler.handle({ operation });
      await expect(prom).rejects.toThrow('pod error');
      await expect(prom).rejects.toThrow(IdpInteractionError);
      // Using the cleaned input for prefilled
      await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: {
        ...params,
        createWebId: false,
        register: false,
        createPod: true,
      }}));
    });
  });
});
