import { Readable } from 'stream';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import type { Agent } from '../../../src/pods/agent/Agent';
import type { IdentifierGenerator } from '../../../src/pods/generate/IdentifierGenerator';
import type { Resource, ResourcesGenerator } from '../../../src/pods/generate/ResourcesGenerator';
import { GeneratedPodManager } from '../../../src/pods/GeneratedPodManager';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { ConflictHttpError } from '../../../src/util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';

describe('A GeneratedPodManager', (): void => {
  const base = 'http://test.com/';
  let agent: Agent;
  let store: ResourceStore;
  let generatorData: Resource[];
  const idGenerator: IdentifierGenerator = {
    generate: (slug: string): ResourceIdentifier => ({ path: `${base}${slug}/` }),
  };
  let resGenerator: ResourcesGenerator;
  let manager: GeneratedPodManager;

  beforeEach(async(): Promise<void> => {
    agent = {
      login: 'user',
      name: 'first last',
      webId: 'http://secure/webId',
    };
    store = {
      getRepresentation: jest.fn((): any => {
        throw new NotFoundHttpError();
      }),
      setRepresentation: jest.fn(),
    } as any;
    generatorData = [
      { identifier: { path: '/path/' }, representation: '/' as any },
      { identifier: { path: '/path/a/' }, representation: '/a/' as any },
      { identifier: { path: '/path/a/b' }, representation: '/a/b' as any },
    ];
    resGenerator = {
      generate: jest.fn(async function* (): any {
        yield* generatorData;
      }),
    };
    manager = new GeneratedPodManager(store, idGenerator, resGenerator);
  });

  it('throws an error if the generate identifier is not available.', async(): Promise<void> => {
    (store.getRepresentation as jest.Mock).mockImplementationOnce((): any => ({
      data: Readable.from([]),
      metadata: new RepresentationMetadata(),
      binary: true,
    }));
    const result = manager.createPod(agent);
    await expect(result).rejects.toThrow(`There already is a resource at ${base}user/`);
    await expect(result).rejects.toThrow(ConflictHttpError);
  });

  it('generates an identifier and writes containers before writing the resources in them.', async(): Promise<void> => {
    await expect(manager.createPod(agent)).resolves.toEqual({ path: `${base}${agent.login}/` });

    expect(store.setRepresentation).toHaveBeenCalledTimes(3);
    expect(store.setRepresentation).toHaveBeenNthCalledWith(1, { path: '/path/' }, '/');
    expect(store.setRepresentation).toHaveBeenNthCalledWith(2, { path: '/path/a/' }, '/a/');
    expect(store.setRepresentation).toHaveBeenNthCalledWith(3, { path: '/path/a/b' }, '/a/b');
  });
});
