import type { HttpHandler, Initializer, ResourceStore } from '../../src';
import { LDP } from '../../src';
import { describeIf, ResourceHelper } from '../util/TestHelpers';
import { BASE, instantiateFromConfig } from './Config';

/**
 * Test the general functionality of the server using a RedisResourceLocker
 */
describeIf('docker', 'A server with a RedisResourceLocker as ResourceLocker', (): void => {
  let handler: HttpHandler;
  let handler2: HttpHandler;
  let resourceHelper: ResourceHelper;
  let resourceHelper2: ResourceHelper;
  let internalStore: ResourceStore;
  let variables: Record<string, any>;

  beforeAll(async(): Promise<void> => {
    variables = {
      'urn:solid-server:default:variable:baseUrl': BASE,
    };
    internalStore = await instantiateFromConfig(
      'urn:solid-server:default:MemoryResourceStore',
      'ldp-with-auth-with-redis.json',
      variables,
    ) as ResourceStore;
    variables['urn:solid-server:default:variable:store'] = internalStore;

    // Create and initialize the HTTP handler and related components
    let initializer: Initializer;
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      'ldp-with-auth-with-redis.json',
      variables,
    );
    ({ handler, initializer } = instances);
    await initializer.handleSafe();

    // Create test helpers for manipulating the components
    resourceHelper = new ResourceHelper(handler, BASE);
  });

  describe('works with 2 server instances running and handling requests', (): void => {
    beforeAll(async(): Promise<void> => {
      // Create and initialize the second HTTP handler and related components
      let initializer2: Initializer;
      const instances2 = await instantiateFromConfig(
        'urn:solid-server:test:Instances',
        'ldp-with-auth-with-redis.json',
        { ...variables, 'urn:solid-server:default:variable:port': 3001 },
      );
      ({ handler: handler2, initializer: initializer2 } = instances2);
      await initializer2.handleSafe();

      // Create test helpers for manipulating the components
      resourceHelper2 = new ResourceHelper(handler2, BASE);
    });

    it('can add a file to the store, read it and delete it.', async(): Promise<void> => {
      // Create file
      const filePath = 'testfile2.txt';
      const fileUrl = `${BASE}/${filePath}`;
      let response = await resourceHelper.createResource(
        '../assets/testfile2.txt', filePath, 'text/plain',
      );

      // Get file
      response = await resourceHelper2.getResource(fileUrl);
      expect(response.statusCode).toBe(200);
      expect(response._getBuffer().toString()).toContain('TESTFILE2');
      expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
      expect(response.getHeaders().link).toContain(`<${fileUrl}.acl>; rel="acl"`);

      // DELETE file
      await resourceHelper2.deleteResource(fileUrl);
      await resourceHelper2.shouldNotExist(fileUrl);
      await resourceHelper.shouldNotExist(fileUrl);
    });
  });

  it('can add a file to the store, read it and delete it.', async(): Promise<void> => {
    // Create file
    const filePath = 'testfile2.txt';
    const fileUrl = `${BASE}/${filePath}`;
    let response = await resourceHelper.createResource(
      '../assets/testfile2.txt', filePath, 'text/plain',
    );

    // Get file
    response = await resourceHelper.getResource(fileUrl);
    expect(response.statusCode).toBe(200);
    expect(response._getBuffer().toString()).toContain('TESTFILE2');
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${fileUrl}.acl>; rel="acl"`);

    // DELETE file
    await resourceHelper.deleteResource(fileUrl);
    await resourceHelper.shouldNotExist(fileUrl);
  });

  it('can create a folder and delete it.', async(): Promise<void> => {
    const containerPath = 'secondfolder/';
    const containerUrl = `${BASE}/${containerPath}`;
    // PUT
    let response = await resourceHelper.createContainer(containerPath);

    // GET
    response = await resourceHelper.getContainer(containerUrl);
    expect(response.statusCode).toBe(200);
    expect(response.getHeaders().link).toContain(`<${LDP.Container}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${LDP.BasicContainer}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${containerUrl}.acl>; rel="acl"`);

    // DELETE
    await resourceHelper.deleteResource(containerUrl);
    await resourceHelper.shouldNotExist(containerUrl);
  });

  it('can upload and delete an image.', async(): Promise<void> => {
    const filePath = 'image.png';
    const fileUrl = `${BASE}/${filePath}`;
    let response = await resourceHelper.createResource(
      '../assets/testimage.png', filePath, 'image/png',
    );

    // GET
    response = await resourceHelper.getResource(fileUrl);
    expect(response.statusCode).toBe(200);
    expect(response._getHeaders()['content-type']).toBe('image/png');

    // DELETE
    await resourceHelper.deleteResource(fileUrl);
    await resourceHelper.shouldNotExist(fileUrl);
  });

  it('can get a resource multiple times.', async(): Promise<void> => {
    const filePath = 'image.png';
    const fileUrl = `${BASE}/${filePath}`;
    let response = await resourceHelper.createResource(
      '../assets/testimage.png', filePath, 'image/png',
    );

    // GET
    response = await resourceHelper.getResource(fileUrl);
    expect(response.statusCode).toBe(200);
    response = await resourceHelper.getResource(fileUrl);
    expect(response.statusCode).toBe(200);
    response = await resourceHelper.getResource(fileUrl);
    expect(response.statusCode).toBe(200);
    response = await resourceHelper.getResource(fileUrl);
    expect(response.statusCode).toBe(200);

    // DELETE
    await resourceHelper.deleteResource(fileUrl);
    await resourceHelper.shouldNotExist(fileUrl);
  });
});
