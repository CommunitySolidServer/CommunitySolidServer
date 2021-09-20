import { CredentialGroup } from '../../../src/authentication/Credentials';
import type { PermissionReader, PermissionReaderInput } from '../../../src/authorization/PermissionReader';
import { UnionPermissionReader } from '../../../src/authorization/UnionPermissionReader';

describe('A UnionPermissionReader', (): void => {
  const input: PermissionReaderInput = { credentials: {}, identifier: { path: 'http://test.com/foo' }};
  let readers: jest.Mocked<PermissionReader>[];
  let unionReader: UnionPermissionReader;

  beforeEach(async(): Promise<void> => {
    readers = [
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue({}),
      } as any,
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue({}),
      } as any,
    ];

    unionReader = new UnionPermissionReader(readers);
  });

  it('only uses the results of readers that can handle the input.', async(): Promise<void> => {
    readers[0].canHandle.mockRejectedValue(new Error('bad request'));
    readers[0].handle.mockResolvedValue({ [CredentialGroup.agent]: { read: true }});
    readers[1].handle.mockResolvedValue({ [CredentialGroup.agent]: { write: true }});
    await expect(unionReader.handle(input)).resolves.toEqual({ [CredentialGroup.agent]: { write: true }});
  });

  it('combines results.', async(): Promise<void> => {
    readers[0].handle.mockResolvedValue(
      { [CredentialGroup.agent]: { read: true }, [CredentialGroup.public]: undefined },
    );
    readers[1].handle.mockResolvedValue(
      { [CredentialGroup.agent]: { write: true }, [CredentialGroup.public]: { read: false }},
    );
    await expect(unionReader.handle(input)).resolves.toEqual({
      [CredentialGroup.agent]: { read: true, write: true },
      [CredentialGroup.public]: { read: false },
    });
  });

  it('merges same fields using false > true > undefined.', async(): Promise<void> => {
    readers[0].handle.mockResolvedValue(
      { [CredentialGroup.agent]: { read: true, write: false, append: undefined, control: true }},
    );
    readers[1].handle.mockResolvedValue(
      { [CredentialGroup.agent]: { read: false, write: true, append: true, control: true }},
    );
    await expect(unionReader.handle(input)).resolves.toEqual({
      [CredentialGroup.agent]: { read: false, write: false, append: true, control: true },
    });
  });
});
