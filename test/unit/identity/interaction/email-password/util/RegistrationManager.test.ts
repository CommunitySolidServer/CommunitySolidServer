import type { ResourceIdentifier } from '../../../../../../src/http/representation/ResourceIdentifier';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import {
  RegistrationManager,
} from '../../../../../../src/identity/interaction/email-password/util/RegistrationManager';
import type { OwnershipValidator } from '../../../../../../src/identity/ownership/OwnershipValidator';
import type { IdentifierGenerator } from '../../../../../../src/pods/generate/IdentifierGenerator';
import type { PodManager } from '../../../../../../src/pods/PodManager';
import type { PodSettings } from '../../../../../../src/pods/settings/PodSettings';
import { joinUrl } from '../../../../../../src/util/PathUtil';

describe('A RegistrationManager', (): void => {
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
  const rootPod = true;

  const baseUrl = 'http://test.com/';
  const webIdSuffix = '/profile/card';
  let podSettings: PodSettings;
  let identifierGenerator: IdentifierGenerator;
  let ownershipValidator: OwnershipValidator;
  let accountStore: AccountStore;
  let podManager: PodManager;
  let manager: RegistrationManager;

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

    manager = new RegistrationManager({
      baseUrl,
      webIdSuffix,
      identifierGenerator,
      accountStore,
      ownershipValidator,
      podManager,
    });
  });

  describe('validating data', (): void => {
    it('errors on invalid emails.', async(): Promise<void> => {
      let input: any = { email: undefined };
      expect((): any => manager.validateInput(input)).toThrow('Please enter a valid e-mail address.');

      input = { email: '' };
      expect((): any => manager.validateInput(input)).toThrow('Please enter a valid e-mail address.');

      input = { email: 'invalidEmail' };
      expect((): any => manager.validateInput(input)).toThrow('Please enter a valid e-mail address.');
    });

    it('errors on invalid passwords.', async(): Promise<void> => {
      const input: any = { email, webId, password, confirmPassword: 'bad' };
      expect((): any => manager.validateInput(input)).toThrow('Your password and confirmation did not match.');
    });

    it('errors on missing passwords.', async(): Promise<void> => {
      const input: any = { email, webId };
      expect((): any => manager.validateInput(input)).toThrow('Please enter a password.');
    });

    it('errors when setting rootPod to true when not allowed.', async(): Promise<void> => {
      const input = { email, password, confirmPassword, createWebId, rootPod };
      expect((): any => manager.validateInput(input)).toThrow('Creating a root pod is not supported.');
    });

    it('errors when a required WebID is not valid.', async(): Promise<void> => {
      let input: any = { email, password, confirmPassword, register, webId: undefined };
      expect((): any => manager.validateInput(input)).toThrow('Please enter a valid WebID.');

      input = { email, password, confirmPassword, register, webId: '' };
      expect((): any => manager.validateInput(input)).toThrow('Please enter a valid WebID.');
    });

    it('errors on invalid pod names when required.', async(): Promise<void> => {
      let input: any = { email, webId, password, confirmPassword, createPod, podName: undefined };
      expect((): any => manager.validateInput(input)).toThrow('Please specify a Pod name.');

      input = { email, webId, password, confirmPassword, createPod, podName: ' ' };
      expect((): any => manager.validateInput(input)).toThrow('Please specify a Pod name.');

      input = { email, webId, password, confirmPassword, createWebId };
      expect((): any => manager.validateInput(input)).toThrow('Please specify a Pod name.');
    });

    it('errors when no option is chosen.', async(): Promise<void> => {
      const input = { email, webId, password, confirmPassword };
      expect((): any => manager.validateInput(input)).toThrow('Please register for a WebID or create a Pod.');
    });

    it('adds the template parameter if there is one.', async(): Promise<void> => {
      const input = { email, webId, password, confirmPassword, podName, template: 'template', createPod };
      expect(manager.validateInput(input)).toEqual({
        email,
        webId,
        password,
        podName,
        template: 'template',
        createWebId: false,
        register: false,
        createPod,
        rootPod: false,
      });
    });

    it('does not require a pod name when creating a root pod.', async(): Promise<void> => {
      const input = { email, password, confirmPassword, webId, createPod, rootPod };
      expect(manager.validateInput(input, true)).toEqual({
        email, password, webId, createWebId: false, register: false, createPod, rootPod,
      });
    });

    it('trims non-password input parameters.', async(): Promise<void> => {
      let input: any = {
        email: ` ${email} `,
        password: ' a ',
        confirmPassword: ' a ',
        podName: ` ${podName} `,
        template: ' template ',
        createWebId,
        register,
        createPod,
      };
      expect(manager.validateInput(input)).toEqual({
        email, password: ' a ', podName, template: 'template', createWebId, register, createPod, rootPod: false,
      });

      input = { email, webId: ` ${webId} `, password: ' a ', confirmPassword: ' a ', register: true };
      expect(manager.validateInput(input)).toEqual({
        email, webId, password: ' a ', createWebId: false, register, createPod: false, rootPod: false,
      });
    });
  });

  describe('handling data', (): void => {
    it('can register a user.', async(): Promise<void> => {
      const params: any = { email, webId, password, register, createPod: false, createWebId: false };
      await expect(manager.register(params)).resolves.toEqual({
        email,
        webId,
        oidcIssuer: baseUrl,
        createWebId: false,
        register: true,
        createPod: false,
      });

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email, webId, password, { useIdp: true });
      expect(accountStore.verify).toHaveBeenCalledTimes(1);
      expect(accountStore.verify).toHaveBeenLastCalledWith(email);

      expect(identifierGenerator.generate).toHaveBeenCalledTimes(0);
      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
      expect(podManager.createPod).toHaveBeenCalledTimes(0);
    });

    it('can create a pod.', async(): Promise<void> => {
      const params: any = { email, webId, password, podName, createPod, createWebId: false, register: false };
      await expect(manager.register(params)).resolves.toEqual({
        email,
        webId,
        oidcIssuer: baseUrl,
        podBaseUrl: `${baseUrl}${podName}/`,
        createWebId: false,
        register: false,
        createPod: true,
      });

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
      expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
      expect(identifierGenerator.generate).toHaveBeenLastCalledWith(podName);
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith({ path: `${baseUrl}${podName}/` }, podSettings, false);
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email, webId, password, { useIdp: false, podBaseUrl });
      expect(accountStore.verify).toHaveBeenCalledTimes(1);

      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
    });

    it('adds an oidcIssuer to the data when doing both IDP registration and pod creation.', async(): Promise<void> => {
      const params: any = { email, webId, password, confirmPassword, podName, register, createPod, createWebId: false };
      podSettings.oidcIssuer = baseUrl;
      await expect(manager.register(params)).resolves.toEqual({
        email,
        webId,
        oidcIssuer: baseUrl,
        podBaseUrl: `${baseUrl}${podName}/`,
        createWebId: false,
        register: true,
        createPod: true,
      });

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email, webId, password, { useIdp: true, podBaseUrl });
      expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
      expect(identifierGenerator.generate).toHaveBeenLastCalledWith(podName);
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith({ path: `${baseUrl}${podName}/` }, podSettings, false);
      expect(accountStore.verify).toHaveBeenCalledTimes(1);
      expect(accountStore.verify).toHaveBeenLastCalledWith(email);

      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
    });

    it('deletes the created account if pod generation fails.', async(): Promise<void> => {
      const params: any = { email, webId, password, confirmPassword, podName, register, createPod };
      podSettings.oidcIssuer = baseUrl;
      (podManager.createPod as jest.Mock).mockRejectedValueOnce(new Error('pod error'));
      await expect(manager.register(params)).rejects.toThrow('pod error');

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email, webId, password, { useIdp: true, podBaseUrl });
      expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
      expect(identifierGenerator.generate).toHaveBeenLastCalledWith(podName);
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith({ path: `${baseUrl}${podName}/` }, podSettings, false);
      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(1);
      expect(accountStore.deleteAccount).toHaveBeenLastCalledWith(email);

      expect(accountStore.verify).toHaveBeenCalledTimes(0);
    });

    it('can create a WebID with an account and pod.', async(): Promise<void> => {
      const params: any = { email, password, confirmPassword, podName, createWebId, register, createPod };
      const generatedWebID = joinUrl(baseUrl, podName, webIdSuffix);
      podSettings.webId = generatedWebID;
      podSettings.oidcIssuer = baseUrl;

      await expect(manager.register(params)).resolves.toEqual({
        email,
        webId: generatedWebID,
        oidcIssuer: baseUrl,
        podBaseUrl: `${baseUrl}${podName}/`,
        createWebId: true,
        register: true,
        createPod: true,
      });

      expect(identifierGenerator.generate).toHaveBeenCalledTimes(1);
      expect(identifierGenerator.generate).toHaveBeenLastCalledWith(podName);
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email,
        generatedWebID,
        password,
        { useIdp: true, podBaseUrl });
      expect(accountStore.verify).toHaveBeenCalledTimes(1);
      expect(accountStore.verify).toHaveBeenLastCalledWith(email);
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith({ path: `${baseUrl}${podName}/` }, podSettings, false);

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(0);
      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
    });

    it('can create a root pod.', async(): Promise<void> => {
      const params: any = { email, webId, password, createPod, rootPod, createWebId: false, register: false };
      podSettings.podBaseUrl = baseUrl;
      await expect(manager.register(params, true)).resolves.toEqual({
        email,
        webId,
        oidcIssuer: baseUrl,
        podBaseUrl: baseUrl,
        createWebId: false,
        register: false,
        createPod: true,
      });

      expect(ownershipValidator.handleSafe).toHaveBeenCalledTimes(1);
      expect(ownershipValidator.handleSafe).toHaveBeenLastCalledWith({ webId });
      expect(podManager.createPod).toHaveBeenCalledTimes(1);
      expect(podManager.createPod).toHaveBeenLastCalledWith({ path: baseUrl }, podSettings, true);
      expect(accountStore.create).toHaveBeenCalledTimes(1);
      expect(accountStore.create).toHaveBeenLastCalledWith(email,
        webId,
        password,
        { useIdp: false, podBaseUrl: baseUrl });
      expect(accountStore.verify).toHaveBeenCalledTimes(1);

      expect(identifierGenerator.generate).toHaveBeenCalledTimes(0);
      expect(accountStore.deleteAccount).toHaveBeenCalledTimes(0);
    });
  });
});
