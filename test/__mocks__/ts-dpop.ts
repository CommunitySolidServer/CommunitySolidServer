import type { SolidTokenVerifierFunction } from 'ts-dpop';

const solidTokenVerifier = jest.fn().mockResolvedValue({ aud: 'solid', exp: 1234, iat: 1234, iss: 'example.com/idp', webid: 'http://alice.example/card#me' });
export const createSolidTokenVerifier = jest.fn((): SolidTokenVerifierFunction => solidTokenVerifier);
