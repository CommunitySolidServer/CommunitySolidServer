import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Patch } from '../../../../src/http/representation/Patch';
import type { PatchHandlerInput } from '../../../../src/storage/patch/PatchHandler';
import type { RepresentationPatcher } from '../../../../src/storage/patch/RepresentationPatcher';
import { RepresentationPatchHandler } from '../../../../src/storage/patch/RepresentationPatchHandler';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { SimpleSuffixStrategy } from '../../../util/SimpleSuffixStrategy';

describe('A RepresentationPatchHandler', (): void => {
  const identifier = { path: 'http://test.com/foo' };
  const representation = new BasicRepresentation('', 'text/turtle');
  const patch: Patch = new BasicRepresentation('', 'application/sparql-update');
  const patchResult = new BasicRepresentation('', 'application/trig');
  let input: PatchHandlerInput;
  let source: jest.Mocked<ResourceStore>;
  let patcher: jest.Mocked<RepresentationPatcher>;
  let handler: RepresentationPatchHandler;
  let metaStrategy: SimpleSuffixStrategy;
  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn().mockResolvedValue(representation),
      setRepresentation: jest.fn().mockResolvedValue([ identifier ]),
    } as any;

    input = { source, identifier, patch };

    patcher = {
      handleSafe: jest.fn().mockResolvedValue(patchResult),
    } as any;
    metaStrategy = new SimpleSuffixStrategy('.meta');

    handler = new RepresentationPatchHandler(patcher, metaStrategy);
  });

  it('calls the patcher with the representation from the store.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toEqual([ identifier ]);

    expect(patcher.handleSafe).toHaveBeenCalledTimes(1);
    expect(patcher.handleSafe).toHaveBeenLastCalledWith({ identifier, patch, representation });

    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith(identifier, patchResult);
  });

  it('calls the patcher with no representation if there is none.', async(): Promise<void> => {
    source.getRepresentation.mockRejectedValueOnce(new NotFoundHttpError());

    await expect(handler.handle(input)).resolves.toEqual([ identifier ]);

    expect(patcher.handleSafe).toHaveBeenCalledTimes(1);
    expect(patcher.handleSafe).toHaveBeenLastCalledWith({ identifier, patch });

    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith(identifier, patchResult);
  });

  it('errors if the store throws a non-404 error.', async(): Promise<void> => {
    const error = new BadRequestHttpError();
    source.getRepresentation.mockRejectedValueOnce(error);

    await expect(handler.handle(input)).rejects.toThrow(error);
  });

  it('errors if the target is a container.', async(): Promise<void> => {
    identifier.path = 'http://test.com/';
    await expect(handler.handle(input)).rejects.toThrow(ConflictHttpError);
  });

  it('errors if pim storage is deleted (when it was present) to the metadata of a resource.',
    async(): Promise<void> => {
      identifier.path = 'http://test.com/.meta';
      const basicRepresentation = new BasicRepresentation('<http://test.com/> a <http://www.w3.org/ns/pim/space#Storage>.', 'text/turtle');
      source.getRepresentation = jest.fn().mockResolvedValue(basicRepresentation);
      await expect(handler.handle(input)).rejects.toThrow(
        BadRequestHttpError,
      );
    });

  it('errors if pim storage is added (when it was present) to the metadata of a resource.', async(): Promise<void> => {
    identifier.path = 'http://test.com/.meta';
    const basicRepresentation = new BasicRepresentation('<http://test.com/> a <http://www.w3.org/ns/pim/space#Storage>.', 'text/turtle');
    source.getRepresentation = jest.fn().mockResolvedValue(basicRepresentation);
    const patchResult1 = new BasicRepresentation(`_:Ned69b619001a43bda37075bf4bd15448 {
    <http://test.com/> a <http://www.w3.org/ns/pim/space#Storage> .
    <http://test.com/test> a <http://www.w3.org/ns/pim/space#Storage> .
}`, 'application/trig');
    patcher = {
      handleSafe: jest.fn().mockResolvedValue(patchResult1),
    } as any;
    handler = new RepresentationPatchHandler(patcher, metaStrategy);
    await expect(handler.handle(input)).rejects.toThrow(
      BadRequestHttpError,
    );
  });

  it('errors if pim storage is added to the metadata of a resource when the metadata resource was not present.',
    async(): Promise<void> => {
      identifier.path = 'http://test.com/.meta';
      source.getRepresentation.mockRejectedValueOnce(new NotFoundHttpError());
      const patchResult1 = new BasicRepresentation(`_:Ned69b619001a43bda37075bf4bd15448 {
    <http://test.com/> a <http://www.w3.org/ns/pim/space#Storage> .
}`, 'application/trig');
      patcher = {
        handleSafe: jest.fn().mockResolvedValue(patchResult1),
      } as any;
      handler = new RepresentationPatchHandler(patcher, metaStrategy);
      await expect(handler.handle(input)).rejects.toThrow(
        BadRequestHttpError,
      );
    });

  it('errors if ldp:contains is added to the metadata.', async(): Promise<void> => {
    identifier.path = 'http://test.com/.meta';
    const patchResult1 = new BasicRepresentation(`_:Ned69b619001a43bda37075bf4bd15448 {
    <http://test.com/> <http://www.w3.org/ns/ldp#contains> <http://test.com/resource.ttl> .
}`, 'application/trig');
    patcher = {
      handleSafe: jest.fn().mockResolvedValue(patchResult1),
    } as any;
    handler = new RepresentationPatchHandler(patcher, metaStrategy);
    await expect(handler.handle(input)).rejects.toThrow(
      BadRequestHttpError,
    );
  });

  it('calls the patcher with no representation if there is none on metadata.', async(): Promise<void> => {
    identifier.path = 'http://test.com/.meta';
    source.getRepresentation.mockRejectedValueOnce(new NotFoundHttpError());
    await expect(handler.handle(input)).resolves.toEqual([ identifier ]);
  });
});
