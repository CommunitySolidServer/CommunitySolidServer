import { createResponse } from 'node-mocks-http';
import { joinFilePath } from '../../../../src';
import type { HttpResponse } from '../../../../src';
import { RenderEjsHandler } from '../../../../src/server/util/RenderEjsHandler';

describe('RenderEjsHandler', (): void => {
  let response: HttpResponse;
  let templatePath: string;
  let templateFile: string;

  beforeEach((): void => {
    response = createResponse();
    templatePath = joinFilePath(__dirname, '../../../assets/idp');
    templateFile = 'testHtml.ejs';
  });

  it('throws an error if the path is not valid.', async(): Promise<void> => {
    const handler = new RenderEjsHandler<{ message: string }>('/bad/path', 'badFile.thing');
    await expect(handler.handle({
      response,
      props: {
        message: 'cool',
      },
    })).rejects.toThrow(`ENOENT: no such file or directory, open '/bad/path/badFile.thing'`);
  });

  it('throws an error if valid parameters were not provided.', async(): Promise<void> => {
    const handler = new RenderEjsHandler<string>(templatePath, templateFile);
    await expect(handler.handle({
      response,
      props: 'This is an invalid prop.',
    })).rejects.toThrow();
  });

  it('successfully renders a page.', async(): Promise<void> => {
    const handler = new RenderEjsHandler<{ message: string }>(templatePath, templateFile);
    await handler.handle({
      response,
      props: {
        message: 'cool',
      },
    });
    // Cast to any because mock-response depends on express, which this project doesn't have
    const testResponse = response as any;
    expect(testResponse._isEndCalled()).toBe(true);
    expect(testResponse._getData()).toBe('<html><body><p>cool</p></body></html>');
    expect(testResponse._getStatusCode()).toBe(200);
  });

  it('successfully escapes html input.', async(): Promise<void> => {
    const handler = new RenderEjsHandler<{ message: string }>(templatePath, templateFile);
    await handler.handle({
      response,
      props: {
        message: '<script>alert(1)</script>',
      },
    });
    // Cast to any because mock-response depends on express, which this project doesn't have
    const testResponse = response as any;
    expect(testResponse._isEndCalled()).toBe(true);
    expect(testResponse._getData()).toBe('<html><body><p>&lt;script&gt;alert(1)&lt;/script&gt;</p></body></html>');
    expect(testResponse._getStatusCode()).toBe(200);
  });

  it('successfully renders when no props are needed.', async(): Promise<void> => {
    const handler = new RenderEjsHandler<undefined>(templatePath, 'noPropsTestHtml.ejs');
    await handler.handle({
      response,
      props: undefined,
    });
    // Cast to any because mock-response depends on express, which this project doesn't have
    const testResponse = response as any;
    expect(testResponse._isEndCalled()).toBe(true);
    expect(testResponse._getData()).toBe('<html><body><p>secret message</p></body></html>');
    expect(testResponse._getStatusCode()).toBe(200);
  });
});
