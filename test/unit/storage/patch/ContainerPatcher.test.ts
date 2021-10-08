import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Patch } from '../../../../src/http/representation/Patch';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { ContainerPatcher } from '../../../../src/storage/patch/ContainerPatcher';
import type {
  RepresentationPatcherInput,
  RepresentationPatcher,
} from '../../../../src/storage/patch/RepresentationPatcher';
import { SOLID_META } from '../../../../src/util/Vocabularies';
const { namedNode, quad } = DataFactory;

describe('A ContainerPatcher', (): void => {
  const identifier: ResourceIdentifier = { path: 'http://test.com/foo/' };
  const patch: Patch = new BasicRepresentation([], 'type/patch');
  let representation: Representation;
  let args: RepresentationPatcherInput;
  const patchResult = new BasicRepresentation([], 'internal/quads');
  let patcher: jest.Mocked<RepresentationPatcher>;
  let containerPatcher: ContainerPatcher;

  beforeEach(async(): Promise<void> => {
    representation = new BasicRepresentation([], 'internal/quads');
    args = { patch, identifier, representation };

    patcher = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(patchResult),
    } as any;

    containerPatcher = new ContainerPatcher(patcher);
  });

  it('can only handle container identifiers.', async(): Promise<void> => {
    args.identifier = { path: 'http://test.com/foo' };
    await expect(containerPatcher.canHandle(args)).rejects.toThrow('Only containers are supported.');
  });

  it('checks if the patcher can handle the input if there is no representation.', async(): Promise<void> => {
    delete args.representation;

    await expect(containerPatcher.canHandle(args)).resolves.toBeUndefined();

    patcher.canHandle.mockRejectedValueOnce(new Error('unsupported patch'));
    await expect(containerPatcher.canHandle(args)).rejects.toThrow('unsupported patch');
  });

  it('sends a mock representation with the correct type to the patcher to check support.', async(): Promise<void> => {
    await expect(containerPatcher.canHandle(args)).resolves.toBeUndefined();
    expect(patcher.canHandle).toHaveBeenCalledTimes(1);
    expect(patcher.canHandle.mock.calls[0][0].representation?.metadata.contentType).toBe('internal/quads');
  });

  it('passes the arguments to the patcher if there is no representation.', async(): Promise<void> => {
    delete args.representation;
    await expect(containerPatcher.handle(args)).resolves.toBe(patchResult);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    expect(patcher.handle).toHaveBeenLastCalledWith(args);
  });

  it('creates a new representation with all generated metadata removed.', async(): Promise<void> => {
    const triples = [
      quad(namedNode('a'), namedNode('real'), namedNode('triple')),
      quad(namedNode('a'), namedNode('generated'), namedNode('triple')),
    ];
    const metadata = new RepresentationMetadata(identifier);
    metadata.addQuad(triples[0].subject as any, triples[0].predicate as any, triples[0].object as any);
    // Make one of the triples generated
    metadata.addQuad(triples[0].subject as any,
      triples[0].predicate as any,
      triples[0].object as any,
      SOLID_META.terms.ResponseMetadata);
    args.representation = new BasicRepresentation(triples, metadata);

    await expect(containerPatcher.handle(args)).resolves.toBe(patchResult);
    expect(patcher.handle).toHaveBeenCalledTimes(1);
    const callArgs = patcher.handle.mock.calls[0][0];
    expect(callArgs.identifier).toBe(identifier);
    expect(callArgs.patch).toBe(patch);
    // Only content-type metadata
    expect(callArgs.representation?.metadata.quads()).toHaveLength(1);
    expect(callArgs.representation?.metadata.contentType).toBe('internal/quads');
    // Generated data got removed
    const data = await arrayifyStream(callArgs.representation!.data);
    expect(data).toHaveLength(1);
    expect(data[0].predicate.value).toBe('real');
  });
});
