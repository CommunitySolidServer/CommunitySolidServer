import { BaseUrlComputer } from '../../../../../src/init/variables/computers/BaseUrlComputer';

describe('A BaseUrlComputer', (): void => {
  let computer: BaseUrlComputer;

  beforeEach(async(): Promise<void> => {
    computer = new BaseUrlComputer();
  });

  it('extracts the baseUrl parameter.', async(): Promise<void> => {
    await expect(computer.handle({ baseUrl: 'http://example.com/', port: 3333 }))
      .resolves.toEqual('http://example.com/');
  });

  it('uses the port parameter if baseUrl is not defined.', async(): Promise<void> => {
    await expect(computer.handle({ port: 3333 })).resolves.toEqual('http://localhost:3333/');
  });

  it('defaults to port 3000.', async(): Promise<void> => {
    await expect(computer.handle({})).resolves.toEqual('http://localhost:3000/');
  });
});
