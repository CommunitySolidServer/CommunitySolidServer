import type { HttpHandler, Initializer, ResourceStore } from '../../src/';
import { describeIf, FileTestHelper } from '../util/TestHelpers';
import { BASE, instantiateFromConfig } from './Config';

describeIf('docker', 'a server with a SPARQL endpoint as storage', (): void => {
  describe('without acl', (): void => {
    let handler: HttpHandler;
    let fileHelper: FileTestHelper;

    beforeAll(async(): Promise<void> => {
      // Set up the internal store
      const variables: Record<string, any> = {
        'urn:solid-server:default:variable:baseUrl': BASE,
        'urn:solid-server:default:variable:sparqlEndpoint': 'http://localhost:4000/sparql',
      };
      const internalStore = await instantiateFromConfig(
        'urn:solid-server:default:SparqlResourceStore',
        'auth-ldp-handler.json',
        variables,
      ) as ResourceStore;
      variables['urn:solid-server:default:variable:store'] = internalStore;

      // Create and initialize the HTTP handler and related components
      let initializer: Initializer;
      const instances = await instantiateFromConfig(
        'urn:solid-server:test:Instances',
        'auth-ldp-handler.json',
        variables,
      ) as Record<string, any>;
      ({ handler, initializer } = instances);
      await initializer.handleSafe();

      // Create test helpers for manipulating the components
      fileHelper = new FileTestHelper(handler, new URL(BASE));
    });

    it('can add a Turtle file to the store.', async():
    Promise<void> => {
      // POST
      const response = await fileHelper.createFile('../assets/person.ttl', 'person', 'text/turtle');
      const id = response._getHeaders().location;
      expect(id).toBeTruthy();
    });
  });
});
