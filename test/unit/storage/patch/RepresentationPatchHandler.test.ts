import type { Representation } from '../../../../src';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Patch } from '../../../../src/http/representation/Patch';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { PatchHandlerInput } from '../../../../src/storage/patch/PatchHandler';
import type { RepresentationPatcher } from '../../../../src/storage/patch/RepresentationPatcher';
import { RepresentationPatchHandler } from '../../../../src/storage/patch/RepresentationPatchHandler';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';

describe('A RepresentationPatchHandler', (): void => {
  const identifier = { path: 'http://test.com/foo' };
  const representation = new BasicRepresentation('', 'text/turtle');
  const patch: Patch = new BasicRepresentation('', 'application/sparql-update');
  const patchResult = new BasicRepresentation('', 'application/trig');
  let input: PatchHandlerInput;
  let source: jest.Mocked<ResourceStore>;
  let patcher: jest.Mocked<RepresentationPatcher<Representation>>;
  let handler: RepresentationPatchHandler;

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn().mockResolvedValue(representation),
      setRepresentation: jest.fn().mockResolvedValue({
        [identifier.path]: new RepresentationMetadata(identifier),
      }),
    } as any;

    input = { source, identifier, patch };

    patcher = {
      handleSafe: jest.fn().mockResolvedValue(patchResult),
    } as any;

    handler = new RepresentationPatchHandler(patcher);
  });

  it('calls the patcher with the representation from the store.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toEqual({
      [identifier.path]: new RepresentationMetadata(identifier),
    });

    expect(patcher.handleSafe).toHaveBeenCalledTimes(1);
    expect(patcher.handleSafe).toHaveBeenLastCalledWith({ identifier, patch, representation });

    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith(identifier, patchResult);
  });

  it('calls the patcher with no representation if there is none.', async(): Promise<void> => {
    source.getRepresentation.mockRejectedValueOnce(new NotFoundHttpError());

    await expect(handler.handle(input)).resolves.toEqual({
      [identifier.path]: new RepresentationMetadata(identifier),
    });

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
});
