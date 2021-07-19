import { resolveAssetPath } from '../../../../src/util/PathUtil';
import { readTemplate } from '../../../../src/util/templates/TemplateEngine';
import { mockFs } from '../../../util/Util';

jest.mock('fs');

describe('readTemplate', (): void => {
  const templateFile = 'template.xyz';
  const templatePath = 'other';

  beforeEach(async(): Promise<void> => {
    const { data } = mockFs(resolveAssetPath(''));
    Object.assign(data, {
      'template.xyz': '{{template}}',
      other: {
        'template.xyz': '{{other}}',
      },
    });
  });

  it('returns the empty string when no template is provided.', async(): Promise<void> => {
    await expect(readTemplate()).resolves.toBe('');
  });

  it('accepts string templates.', async(): Promise<void> => {
    await expect(readTemplate({ templateString: 'abc' })).resolves.toBe('abc');
  });

  it('accepts a filename.', async(): Promise<void> => {
    await expect(readTemplate({ templateFile })).resolves.toBe('{{template}}');
  });

  it('accepts a filename and path.', async(): Promise<void> => {
    await expect(readTemplate({ templateFile, templatePath })).resolves.toBe('{{other}}');
  });
});
