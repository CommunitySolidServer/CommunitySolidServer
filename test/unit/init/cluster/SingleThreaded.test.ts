import { ComponentsManager } from 'componentsjs';
import type { Resource } from 'rdf-object';
import { listSingleThreadedComponents } from '../../../../src';

const moduleState = {
  contexts: {
    'https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^5.0.0/components/context.jsonld': 'dist/components/context.jsonld',
  },
};

const mockResource: Resource = {
  isA: jest.fn().mockReturnValue(true),
  value: '#ViolatingClass',
  property: { type: { value: '#ViolatingClass' }},
} as any;

const singleThreaded: Resource = {
  isA: jest.fn().mockReturnValue(true),
  value: 'http://myFullIRI/#SingleThreaded',
  property: { type: { value: 'http://myFullIRI/#SingleThreaded' }},
} as any;

const myExpandTerm = jest.fn().mockImplementation((name: string): any => `http://myFullIRI/#${name}`);

function mockComponentsManagerFn(length: number): jest.Mocked<ComponentsManager<any>> {
  const resources: Resource[] = [ ...Array.from<Resource>({ length: length - 1 }).fill(mockResource), singleThreaded ];
  return { moduleState, getInstantiatedResources: jest.fn((): any => resources) } as any;
}

jest.mock('jsonld-context-parser/lib/ContextParser', (): any => ({
  ContextParser: jest.fn().mockImplementation((): any => ({
    parse: jest.fn(async(): Promise<any> => ({
      expandTerm: myExpandTerm,
    })),
  })),
}));

jest.mock('componentsjs', (): any => ({
  ComponentsManager: {
    build: jest.fn(async(props: any): Promise<ComponentsManager<any>> => mockComponentsManagerFn(props.length)),
  },
  PrefetchedDocumentLoader: jest.fn().mockImplementation((): any => ({
    load: jest.fn(),
  })),
}));

describe('A SingleThreaded', (): void => {
  it('has a listSingleThreadedComponents that works with 1 resource.', async(): Promise<void> => {
    const comp = await ComponentsManager.build({ length: 2 } as any);
    await expect(listSingleThreadedComponents(comp)).resolves.toEqual([ 'ViolatingClass' ]);
  });

  it('has a listSingleThreadedComponents that works with multiple resources.', async(): Promise<void> => {
    const comp = await ComponentsManager.build({ length: 3 } as any);
    await expect(listSingleThreadedComponents(comp)).resolves.toEqual([ 'ViolatingClass', 'ViolatingClass' ]);
  });

  it('errors when the interface IRI cannot be expanded.', async(): Promise<void> => {
    myExpandTerm.mockReturnValueOnce(null);
    const comp = await ComponentsManager.build({} as any);
    await expect(listSingleThreadedComponents(comp)).rejects
      .toThrow(/^Could not expand .* to IRI!/u);
  });
});
