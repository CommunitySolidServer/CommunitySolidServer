import { Readable } from 'node:stream';
import { DataFactory } from 'n3';
import type { Quad } from 'n3';
import rdfDereferencer from 'rdf-dereference';
import { v4 } from 'uuid';
import { TokenOwnershipValidator } from '../../../../src/identity/ownership/TokenOwnershipValidator';
import type { ExpiringStorage } from '../../../../src/storage/keyvalue/ExpiringStorage';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { extractErrorTerms } from '../../../../src/util/errors/HttpErrorUtil';
import { SOLID } from '../../../../src/util/Vocabularies';

const { literal, namedNode, quad } = DataFactory;

jest.mock('uuid');
jest.mock('rdf-dereference', (): any => ({
  dereference: jest.fn(),
}));

function quadToString(qq: Quad): string {
  const subPred = `<${qq.subject.value}> <${qq.predicate.value}>`;
  if (qq.object.termType === 'Literal') {
    return `${subPred} "${qq.object.value}"`;
  }
  return `${subPred} <${qq.object.value}>`;
}

describe('A TokenOwnershipValidator', (): void => {
  const rdfDereferenceMock: jest.Mocked<typeof rdfDereferencer> = rdfDereferencer as any;
  const webId = 'http://alice.test.com/#me';
  const token = 'randomlyGeneratedToken';
  const tokenTriple = quad(namedNode(webId), SOLID.terms.oidcIssuerRegistrationToken, literal(token));
  const tokenString = `${quadToString(tokenTriple)}.`;
  let storage: ExpiringStorage<string, string>;
  let validator: TokenOwnershipValidator;

  function mockDereference(qq?: Quad): any {
    rdfDereferenceMock.dereference.mockImplementation((uri: string): any => ({
      uri,
      data: Readable.from(qq ? [ qq ] : []),
    }));
  }

  beforeEach(async(): Promise<void> => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    jest.mocked(v4).mockReturnValue(token);

    const map = new Map<string, any>();
    storage = {
      get: jest.fn().mockImplementation((key: string): any => map.get(key)),
      set: jest.fn().mockImplementation((key: string, value: any): any => map.set(key, value)),
      delete: jest.fn().mockImplementation((key: string): any => map.delete(key)),
    } as any;

    mockDereference();

    validator = new TokenOwnershipValidator(storage);
  });

  it('errors if no token is stored in the storage.', async(): Promise<void> => {
    // Even if the token is in the WebId, it will error since it's not in the storage
    mockDereference(tokenTriple);
    let error: unknown;
    try {
      await validator.handle({ webId });
    } catch (err: unknown) {
      error = err;
    }
    expect(error).toEqual(expect.objectContaining({ message: expect.stringContaining(tokenString) }));
    expect(BadRequestHttpError.isInstance(error)).toBe(true);
    expect(extractErrorTerms((error as BadRequestHttpError).metadata))
      .toEqual({ quad: tokenString });
    expect(rdfDereferenceMock.dereference).toHaveBeenCalledTimes(0);
  });

  it('errors if the expected triple is missing.', async(): Promise<void> => {
    // First call will add the token to the storage
    await expect(validator.handle({ webId })).rejects.toThrow(tokenString);
    expect(rdfDereferenceMock.dereference).toHaveBeenCalledTimes(0);
    // Second call will fetch the WebId
    await expect(validator.handle({ webId })).rejects.toThrow(tokenString);
    expect(rdfDereferenceMock.dereference).toHaveBeenCalledTimes(1);
  });

  it('resolves if the WebId contains the verification triple.', async(): Promise<void> => {
    mockDereference(tokenTriple);
    // First call will add the token to the storage
    await expect(validator.handle({ webId })).rejects.toThrow(tokenString);
    // Second call will succeed since it has the verification triple
    await expect(validator.handle({ webId })).resolves.toBeUndefined();
  });

  it('fails if the WebId contains the wrong verification triple.', async(): Promise<void> => {
    const wrongQuad = quad(namedNode(webId), SOLID.terms.oidcIssuerRegistrationToken, literal('wrongToken'));
    mockDereference(wrongQuad);
    // First call will add the token to the storage
    await expect(validator.handle({ webId })).rejects.toThrow(tokenString);
    // Second call will fail since it has the wrong verification triple
    await expect(validator.handle({ webId })).rejects.toThrow(tokenString);
  });
});
