import fetch from '@rdfjs/fetch';
import type { DatasetResponse } from '@rdfjs/fetch-lite';
import { DataFactory } from 'n3';
import type { Quad } from 'n3';
import type { DatasetCore } from 'rdf-js';
import {
  BasicIssuerReferenceWebIdOwnershipValidator,
} from '../../../../../src/identity/interaction/util/BasicIssuerReferenceWebIdOwnershipValidator';
import { SOLID } from '../../../../../src/util/Vocabularies';
const { literal, namedNode, quad } = DataFactory;

jest.mock('@rdfjs/fetch');

function quadToString(qq: Quad): string {
  const subPred = `<${qq.subject.value}> <${qq.predicate.value}>`;
  if (qq.object.termType === 'Literal') {
    return `${subPred} "${qq.object.value}"`;
  }
  return `${subPred} <${qq.object.value}>`;
}

describe('A BasicIssuerReferenceWebIdOwnershipValidator', (): void => {
  const fetchMock: jest.Mock = fetch as any;
  const issuer = 'http://test.com/foo/';
  const webId = 'http://alice.test.com/#me';
  const interactionId = 'interaction!!';
  let rawResponse: DatasetResponse<DatasetCore>;
  let dataset: DatasetCore;
  let triples: Quad[];
  const issuerTriple = quad(namedNode(webId), SOLID.terms.oidcIssuer, namedNode(issuer));
  const tokenTriple = quad(namedNode(webId), SOLID.terms.oidcIssuerRegistrationToken, literal(interactionId));
  let validator: BasicIssuerReferenceWebIdOwnershipValidator;

  beforeEach(async(): Promise<void> => {
    triples = [];

    dataset = {
      has: (qq: Quad): boolean => triples.some((triple): boolean => triple.equals(qq)),
    } as any;

    rawResponse = {
      dataset: async(): Promise<DatasetCore> => dataset,
    } as any;

    fetchMock.mockReturnValue(rawResponse);

    validator = new BasicIssuerReferenceWebIdOwnershipValidator(issuer);
  });

  it('errors if the expected triples are missing.', async(): Promise<void> => {
    const prom = validator.handle({ webId, interactionId });
    await expect(prom).rejects.toThrow(quadToString(issuerTriple));
    await expect(prom).rejects.toThrow(quadToString(tokenTriple));
  });

  it('only requests the needed triples.', async(): Promise<void> => {
    triples = [ issuerTriple ];
    let prom = validator.handle({ webId, interactionId });
    await expect(prom).rejects.not.toThrow(quadToString(issuerTriple));
    await expect(prom).rejects.toThrow(quadToString(tokenTriple));

    triples = [ tokenTriple ];
    prom = validator.handle({ webId, interactionId });
    await expect(prom).rejects.toThrow(quadToString(issuerTriple));
    await expect(prom).rejects.not.toThrow(quadToString(tokenTriple));
  });

  it('resolves if all required triples are present.', async(): Promise<void> => {
    triples = [ issuerTriple, tokenTriple ];
    await expect(validator.handle({ webId, interactionId })).resolves.toBeUndefined();
  });
});
