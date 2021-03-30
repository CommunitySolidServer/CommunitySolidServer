import type { HttpHandler, Initializer, ResourceStore } from '../../src/';
import { describeIf, ResourceHelper } from '../util/TestHelpers';
import { BASE, instantiateFromConfig } from './Config';

describeIf('docker', 'A server with a SPARQL endpoint as storage', (): void => {
  let handler: HttpHandler;
  let resourceHelper: ResourceHelper;

  beforeAll(async(): Promise<void> => {
    // Set up the internal store
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:baseUrl': BASE,
      'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:4000/sparql',
    };
    const internalStore = await instantiateFromConfig(
      'urn:solid-server:default:SparqlResourceStore',
      'ldp-with-auth.json',
      variables,
    ) as ResourceStore;
    variables['urn:solid-server:default:variable:store'] = internalStore;

    // Create and initialize the HTTP handler and related components
    let initializer: Initializer;
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      'ldp-with-auth.json',
      variables,
    ) as Record<string, any>;
    ({ handler, initializer } = instances);
    await initializer.handleSafe();

    // Create test helpers for manipulating the components
    resourceHelper = new ResourceHelper(handler, BASE);
  });

  it('can add a Turtle file to the store.', async():
  Promise<void> => {
    // PUT
    const response = await resourceHelper.createResource('../assets/person.ttl', 'person', 'text/turtle');
    expect(response).toBeTruthy();
  });
});
