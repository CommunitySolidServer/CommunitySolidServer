import { DataFactory } from 'n3';
import type { Quad } from 'rdf-js';
import { N3PatchModesExtractor } from '../../../../src/authorization/permissions/N3PatchModesExtractor';
import { AccessMode } from '../../../../src/authorization/permissions/Permissions';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { N3Patch } from '../../../../src/http/representation/N3Patch';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

const { quad, namedNode } = DataFactory;

describe('An N3PatchModesExtractor', (): void => {
  const triple: Quad = quad(namedNode('a'), namedNode('b'), namedNode('c'));
  let patch: N3Patch;
  let operation: Operation;
  const extractor = new N3PatchModesExtractor();

  beforeEach(async(): Promise<void> => {
    patch = new BasicRepresentation() as N3Patch;
    patch.deletes = [];
    patch.inserts = [];
    patch.conditions = [];

    operation = {
      method: 'PATCH',
      body: patch,
      preferences: {},
      target: { path: 'http://example.com/foo' },
    };
  });

  it('can only handle N3 Patch documents.', async(): Promise<void> => {
    operation.body = new BasicRepresentation();
    await expect(extractor.canHandle(operation)).rejects.toThrow(NotImplementedHttpError);

    operation.body = patch;
    await expect(extractor.canHandle(operation)).resolves.toBeUndefined();
  });

  it('requires read access when there are conditions.', async(): Promise<void> => {
    patch.conditions = [ triple ];
    await expect(extractor.handle(operation)).resolves.toEqual(new Set([ AccessMode.read ]));
  });

  it('requires append access when there are inserts.', async(): Promise<void> => {
    patch.inserts = [ triple ];
    await expect(extractor.handle(operation)).resolves.toEqual(new Set([ AccessMode.append ]));
  });

  it('requires read and write access when there are inserts.', async(): Promise<void> => {
    patch.deletes = [ triple ];
    await expect(extractor.handle(operation)).resolves.toEqual(new Set([ AccessMode.read, AccessMode.write ]));
  });

  it('combines required access modes when required.', async(): Promise<void> => {
    patch.conditions = [ triple ];
    patch.inserts = [ triple ];
    patch.deletes = [ triple ];
    await expect(extractor.handle(operation)).resolves
      .toEqual(new Set([ AccessMode.read, AccessMode.append, AccessMode.write ]));
  });
});
