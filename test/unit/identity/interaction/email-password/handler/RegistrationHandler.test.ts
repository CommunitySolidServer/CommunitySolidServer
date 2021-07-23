import urljoin from 'url-join';
import {
  RegistrationHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/RegistrationHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import { IdpInteractionError } from '../../../../../../src/identity/interaction/util/IdpInteractionError';
import type { OwnershipValidator } from '../../../../../../src/identity/ownership/OwnershipValidator';
import type { ResourceIdentifier } from '../../../../../../src/ldp/representation/ResourceIdentifier';
import type { IdentifierGenerator } from '../../../../../../src/pods/generate/IdentifierGenerator';
import type { PodManager } from '../../../../../../src/pods/PodManager';
import type { HttpRequest } from '../../../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../../../src/server/HttpResponse';
import type { TemplateHandler } from '../../../../../../src/server/util/TemplateHandler';
import { createPostFormRequest } from './Util';

describe('A RegistrationHandler', (): void => {
  // "Correct" values for easy object creation
  const webId = 'http://alice.test.com/card#me';
  const email = 'alice@test.email';
  const password = 'superSecretPassword';
  const confirmPassword = password;
  const podName = 'alice';
  const podBaseUrl = 'http://test.com/alice/';
  // Strings instead of booleans because this is form data
  const createWebId = 'true';
  const register = 'true';
  const createPod = 'true';

  let request: HttpRequest;
  const response: HttpResponse = {} as any;

  const baseUrl = 'http://test.com/';
  const webIdSuffix = '/profile/card';
  let identifierGenerator: IdentifierGenerator;
  let ownershipValidator: OwnershipValidator;
  let accountStore: AccountStore;
  let podManager: PodManager;
  let responseHandler: TemplateHandler<NodeJS.Dict<any>>;
  let handler: RegistrationHandler;

  beforeEach(async(): Promise<void> => {
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

    responseHandler = {
      handleSafe: jest.fn(),
    } as any;

    handler = new RegistrationHandler({
      baseUrl,
      webIdSuffix,
      identifierGenerator,
      accountStore,
      ownershipValidator,
      podManager,
      responseHandler,
    });
  });

  describe('validating data', (): void => {
    it('rejects array inputs.', async(): Promise<void> => {
      request = createPostFormRequest({ data: [ 'a', 'b' ]});
      await expect(handler.handle({ request, response })).rejects.toThrow('Multiple values found for key data');
    });

    it('errors on invalid emails.', async(): Promise<void> => {
      request = createPostFormRequest({ email: undefined });
      await expect(handler.handle({ request, response })).rejects.toThrow('A valid e-mail address is required');

      request = createPostFormRequest({ email: '' });
      await expect(handler.handle({ request, response })).rejects.toThrow('A valid e-mail address is required');

      request = createPostFormRequest({ email: 'invalidEmail' });
      await expect(handler.handle({ request, response })).rejects.toThrow('A valid e-mail address is required');
    });

    it('errors when an unnecessary WebID is provided.', async(): Promise<void> => {
      request = createPostFormRequest({ email, webId, createWebId });
      await expect(handler.handle({ request, response }))
        .rejects.toThrow('A WebID should only be provided when no new one is being created');
    });

    it('errors when a required WebID is not valid.', async(): Promise<void> => {
      request = createPostFormRequest({ email, webId: undefined });
      await expect(handler.handle({ request, response }))
        .rejects.toThrow('A WebID is required if no new one is being created');

      request = createPostFormRequest({ email, webId: '' });
      await expect(handler.handle({ request, response }))
        .rejects.toThrow('A WebID is required if no new one is being created');
    });

    it('errors when an unnecessary password is provided.', async(): Promise<void> => {
      request = createPostFormRequest({ email, webId, password });
      await expect(handler.handle({ request, response }))
        .rejects.toThrow('A password should only be provided when registering');
    });

    it('errors on invalid passwords when registering.', async(): Promise<void> => {
      request = createPostFormRequest({ email, webId, password, confirmPassword: 'bad', register });
      await expect(handler.handle({ request, response })).rejects.toThrow('Password and confirmation do not match');
    });

    it('errors when an unnecessary pod name is provided.', async(): Promise<void> => {
      request = createPostFormRequest({ email, webId, podName });
      await expect(handler.handle({ request, response }))
        .rejects.toThrow('A pod name should only be provided when creating a pod and/or WebID');
    });

    it('errors on invalid pod names when required.', async(): Promise<void> => {
      request = createPostFormRequest({ email, podName: undefined, createWebId });
      await expect(handler.handle({ request, response }))
        .rejects.toThrow('A pod name is required when creating a pod and/or WebID');

      request = createPostFormRequest({ email, webId, podName: '', createPod });
      await expect(handler.handle({ request, response }))
        .rejects.toThrow('A pod name is required when creating a pod and/or WebID');
    });

    it('errors when trying to create a WebID without registering or creating a pod.', async(): Promise<void> => {
      request = createPostFormRequest({ email, podName, createWebId });
      await expect(handler.handle({ request, response }))
        .rejects.toThrow('Creating a WebID is only possible when also registering and creating a pod');

      request = createPostFormRequest({ email, podName, password, confirmPassword, createWebId, register });
      await expect(handler.handle({ request, response }))
        .rejects.toThrow('Creating a WebID is only possible when also registering and creating a pod');

      request = createPostFormRequest({ email, podName, createWebId, createPod });
      await expect(handler.handle({ request, response }))
        .rejects.toThrow('Creating a WebID is only possible when also registering and creating a pod');
    });

    it('errors when no option is chosen.', async(): Promise<void> => {
      request = createPostFormRequest({ email, webId });
      await expect(handler.handle({ request, response })).rejects.toThrow('At least one option needs to be chosen');
    });
  });

  describe('handling data', (): void => {
    it('can register a user.', async(): Promise<void> => {
      request = createPostFormRequest({ email, webId, password, confirmPassword, register });
      await expect(handler.handle({ request, response })).resolves.toBeUndefined();

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
      request = createPostFormRequest(params);
      await expect(handler.handle({ request, response })).resolves.toBeUndefined();

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
      expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
      expect(identifierGenerator.generate).toHaveBeenLastCalledWith(podName);
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith(
        { path: `${baseUrl}${podName}/` }, { podBaseUrl, ...params },
      );

      expect(accountStore.create).toHaveBeenCalledTimes(0);
      expect(accountStore.verify).toHaveBeenCalledTimes(0);
      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
    });

    it('adds an oidcIssuer to the data when doing both IDP registration and pod creation.', async(): Promise<void> => {
      const params = { email, webId, password, confirmPassword, podName, register, createPod };
      request = createPostFormRequest(params);
      await expect(handler.handle({ request, response })).resolves.toBeUndefined();

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email, webId, password);
      expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
      expect(identifierGenerator.generate).toHaveBeenLastCalledWith(podName);
      (params as any).oidcIssuer = baseUrl;
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith(
        { path: `${baseUrl}${podName}/` }, { podBaseUrl, ...params },
      );
      expect(accountStore.verify).toHaveBeenCalledTimes(1);
      expect(accountStore.verify).toHaveBeenLastCalledWith(email);

      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
    });

    it('deletes the created account if pod generation fails.', async(): Promise<void> => {
      const params = { email, webId, password, confirmPassword, podName, register, createPod };
      request = createPostFormRequest(params);
      (podManager.createPod as jest.Mock).mockRejectedValueOnce(new Error('pod error'));
      await expect(handler.handle({ request, response })).rejects.toThrow('pod error');

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email, webId, password);
      expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
      expect(identifierGenerator.generate).toHaveBeenLastCalledWith(podName);
      (params as any).oidcIssuer = baseUrl;
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith(
        { path: `${baseUrl}${podName}/` }, { podBaseUrl, ...params },
      );
      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(1);
      expect(accountStore.deleteAccount).toHaveBeenLastCalledWith(email);

      expect(accountStore.verify).toHaveBeenCalledTimes(0);
    });

    it('can create a WebID with an account and pod.', async(): Promise<void> => {
      const params = { email, password, confirmPassword, podName, createWebId, register, createPod };
      request = createPostFormRequest(params);
      await expect(handler.handle({ request, response })).resolves.toBeUndefined();

      const generatedWebID = urljoin(baseUrl, podName, webIdSuffix);

      expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
      expect(identifierGenerator.generate).toHaveBeenLastCalledWith(podName);
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email, generatedWebID, password);
      expect(accountStore.verify).toHaveBeenCalledTimes(1);
      expect(accountStore.verify).toHaveBeenLastCalledWith(email);
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith(
        { path: `${baseUrl}${podName}/` }, { ...params, podBaseUrl, oidcIssuer: baseUrl, webId: generatedWebID },
      );

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(0);
      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
    });

    it('throws an IdpInteractionError with all data prefilled if something goes wrong.', async(): Promise<void> => {
      const params = { email, webId, podName, createPod };
      request = createPostFormRequest(params);
      (podManager.createPod as jest.Mock).mockRejectedValueOnce(new Error('pod error'));
      const prom = handler.handle({ request, response });
      await expect(prom).rejects.toThrow('pod error');
      await expect(prom).rejects.toThrow(IdpInteractionError);
      await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: params }));
    });
  });
});
