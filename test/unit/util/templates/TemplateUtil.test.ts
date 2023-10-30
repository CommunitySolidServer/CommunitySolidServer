import { resolveAssetPath } from '../../../../src/util/PathUtil';
import { getTemplateFilePath, readTemplate } from '../../../../src/util/templates/TemplateUtil';
import { mockFileSystem } from '../../../util/Util';

jest.mock('node:fs');

describe('TemplateUtil', (): void => {
  describe('#getTemplateFilePath', (): void => {
    const templateFile = 'template.xyz';
    const templatePath = 'other';

    beforeEach(async(): Promise<void> => {
      const { data } = mockFileSystem(resolveAssetPath(''));
      Object.assign(data, {
        'template.xyz': '{{template}}',
        other: {
          'template.xyz': '{{other}}',
        },
      });
    });

    it('returns the undefined when no template is provided.', async(): Promise<void> => {
      expect(getTemplateFilePath()).toBeUndefined();
    });

    it('returns the input if it was a filename.', async(): Promise<void> => {
      expect(getTemplateFilePath(templateFile)).toBe(resolveAssetPath(templateFile));
    });

    it('returns undefined for options with a string template.', async(): Promise<void> => {
      expect(getTemplateFilePath({ templateString: 'abc' })).toBeUndefined();
    });

    it('accepts options with a filename.', async(): Promise<void> => {
      expect(getTemplateFilePath({ templateFile })).toBe(resolveAssetPath(templateFile));
    });

    it('accepts options with a filename and a path.', async(): Promise<void> => {
      expect(getTemplateFilePath({ templateFile, templatePath })).toBe(resolveAssetPath('other/template.xyz'));
    });
  });

  describe('#readTemplate', (): void => {
    const templateFile = 'template.xyz';
    const templatePath = 'other';

    beforeEach(async(): Promise<void> => {
      const { data } = mockFileSystem(resolveAssetPath(''));
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

    it('accepts a filename.', async(): Promise<void> => {
      await expect(readTemplate(templateFile)).resolves.toBe('{{template}}');
    });

    it('accepts options with a string template.', async(): Promise<void> => {
      await expect(readTemplate({ templateString: 'abc' })).resolves.toBe('abc');
    });

    it('accepts options with a filename.', async(): Promise<void> => {
      await expect(readTemplate({ templateFile })).resolves.toBe('{{template}}');
    });

    it('accepts options with a filename and a path.', async(): Promise<void> => {
      await expect(readTemplate({ templateFile, templatePath })).resolves.toBe('{{other}}');
    });
  });
});
