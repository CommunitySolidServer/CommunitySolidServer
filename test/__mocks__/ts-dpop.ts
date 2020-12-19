import type { VerifySolidIdentityFunction } from 'ts-dpop';

const solidIdentityVerifier = jest.fn().mockResolvedValue({ aud: 'solid', exp: 1234, iat: 1234, iss: 'example.com/idp', webid: 'http://alice.example/card#me' });
export const createSolidIdentityVerifier = jest.fn((): VerifySolidIdentityFunction => solidIdentityVerifier);
