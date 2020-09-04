import { RuntimeConfig } from '../../../src/init/RuntimeConfig';

describe('RuntimeConfig', (): void => {
  it('handles undefined args.', async(): Promise<void> => {
    const config = new RuntimeConfig();
    expect(config.port).toEqual(3000);
    expect(config.base).toEqual('http://localhost:3000/');
  });

  it('handles empty args.', async(): Promise<void> => {
    const config = new RuntimeConfig({});
    expect(config.port).toEqual(3000);
    expect(config.base).toEqual('http://localhost:3000/');
  });

  it('handles args with port.', async(): Promise<void> => {
    const config = new RuntimeConfig({ port: 1234 });
    expect(config.port).toEqual(1234);
    expect(config.base).toEqual('http://localhost:1234/');
  });

  it('handles args with base.', async(): Promise<void> => {
    const config = new RuntimeConfig({ base: 'http://example.org/' });
    expect(config.port).toEqual(3000);
    expect(config.base).toEqual('http://example.org/');
  });

  it('handles args with port and base.', async(): Promise<void> => {
    const config = new RuntimeConfig({ port: 1234, base: 'http://example.org/' });
    expect(config.port).toEqual(1234);
    expect(config.base).toEqual('http://example.org/');
  });

  it('handles resetting data.', async(): Promise<void> => {
    const config = new RuntimeConfig({});
    expect(config.port).toEqual(3000);
    expect(config.base).toEqual('http://localhost:3000/');

    config.reset({ port: 1234, base: 'http://example.org/' });
    expect(config.port).toEqual(1234);
    expect(config.base).toEqual('http://example.org/');
  });

  it('ensures trailing slash in base.', async(): Promise<void> => {
    const config = new RuntimeConfig({ base: 'http://example.org' });
    expect(config.base).toEqual('http://example.org/');
  });
});
