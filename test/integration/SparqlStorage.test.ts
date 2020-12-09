import { SparqlDataAccessor } from '../../src/storage/accessors/SparqlDataAccessor';
import { INTERNAL_QUADS } from '../../src/util/ContentTypes';
import { SingleRootIdentifierStrategy } from '../../src/util/identifiers/SingleRootIdentifierStrategy';
import { DataAccessorBasedConfig } from '../configs/DataAccessorBasedConfig';
import { BASE } from '../configs/Util';
import { describeIf, FileTestHelper } from '../util/TestHelpers';

describeIf('docker', 'a server with a SPARQL endpoint as storage', (): void => {
  describe('without acl', (): void => {
    const config = new DataAccessorBasedConfig(BASE,
      new SparqlDataAccessor('http://localhost:4000/sparql', new SingleRootIdentifierStrategy(BASE)),
      INTERNAL_QUADS);
    const handler = config.getHttpHandler();
    const fileHelper = new FileTestHelper(handler, new URL(BASE));

    it('can add a Turtle file to the store.', async():
    Promise<void> => {
      // POST
      const response = await fileHelper.createFile('../assets/person.ttl', 'person', 'text/turtle');
      const id = response._getHeaders().location;
      expect(id).toBeTruthy();
    });
  });
});
