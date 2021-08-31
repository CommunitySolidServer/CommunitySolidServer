import type { CredentialSet } from '../../../src/authentication/Credentials';
import { CredentialGroup } from '../../../src/authentication/Credentials';
import { OwnerPermissionReader } from '../../../src/authorization/OwnerPermissionReader';
import type {
  AccountSettings,
  AccountStore,
} from '../../../src/identity/interaction/email-password/storage/AccountStore';
import type { AuxiliaryIdentifierStrategy } from '../../../src/ldp/auxiliary/AuxiliaryIdentifierStrategy';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';

describe('An OwnerPermissionReader', (): void => {
  const owner = 'http://test.com/alice/profile/card#me';
  const podBaseUrl = 'http://test.com/alice/';
  let credentials: CredentialSet;
  let identifier: ResourceIdentifier;
  let settings: AccountSettings;
  let accountStore: jest.Mocked<AccountStore>;
  let aclStrategy: jest.Mocked<AuxiliaryIdentifierStrategy>;
  let reader: OwnerPermissionReader;

  beforeEach(async(): Promise<void> => {
    credentials = { [CredentialGroup.agent]: { webId: owner }};

    identifier = { path: `${podBaseUrl}.acl` };

    settings = {
      useIdp: true,
      podBaseUrl,
    };

    accountStore = {
      getSettings: jest.fn(async(webId: string): Promise<AccountSettings> => {
        if (webId === owner) {
          return settings;
        }
        throw new Error('No account');
      }),
    } as any;

    aclStrategy = {
      isAuxiliaryIdentifier: jest.fn((id): boolean => id.path.endsWith('.acl')),
    } as any;

    reader = new OwnerPermissionReader(accountStore, aclStrategy);
  });

  it('returns empty permissions for non-ACL resources.', async(): Promise<void> => {
    identifier.path = podBaseUrl;
    await expect(reader.handle({ credentials, identifier })).resolves.toEqual({});
  });

  it('returns empty permissions if there is no agent WebID.', async(): Promise<void> => {
    credentials = {};
    await expect(reader.handle({ credentials, identifier })).resolves.toEqual({});
  });

  it('returns empty permissions if the agent has no account.', async(): Promise<void> => {
    credentials.agent!.webId = 'http://test.com/someone/else';
    await expect(reader.handle({ credentials, identifier })).resolves.toEqual({});
  });

  it('returns empty permissions if the account has no pod.', async(): Promise<void> => {
    delete settings.podBaseUrl;
    await expect(reader.handle({ credentials, identifier })).resolves.toEqual({});
  });

  it('returns empty permissions if the target identifier is not in the pod.', async(): Promise<void> => {
    identifier.path = 'http://somewhere.else/.acl';
    await expect(reader.handle({ credentials, identifier })).resolves.toEqual({});
  });

  it('returns full permissions if the owner is accessing an ACL resource in their pod.', async(): Promise<void> => {
    await expect(reader.handle({ credentials, identifier })).resolves.toEqual({
      [CredentialGroup.agent]: {
        read: true,
        write: true,
        append: true,
        create: true,
        delete: true,
        control: true,
      },
    });
  });
});
