import {
  sanitizeUrlPart,
  splitCommaSeparated,
  isValidFileName,
} from '../../../src/util/StringUtil';

describe('HeaderUtil', (): void => {
  describe('#sanitizeUrlPart', (): void => {
    it('sanitizes part of a URL by replacing non-word characters with dashes (\'-\').', (): void => {
      expect(sanitizeUrlPart('$path segment containing=non-word+chars'))
        .toBe('-path-segment-containing-non-word-chars');
    });
  });

  describe('#splitCommaSeparated', (): void => {
    it('splits strings containing commas into parts based on the location of these commas.', (): void => {
      expect(splitCommaSeparated('this,is,a,comma-separated,string'))
        .toEqual([ 'this', 'is', 'a', 'comma-separated', 'string' ]);
    });
    it('handles strings without commas by returning an array containing solely the original string.', (): void => {
      const strVal = 'this string has no commas';
      expect(splitCommaSeparated(strVal)).toEqual([ strVal ]);
    });
  });

  describe('#validateFileName', (): void => {
    it('returns true if the provided file name is valid.', (): void => {
      expect(isValidFileName('valid-file.test')).toBeTruthy();
    });
    it('returns false if the provided file name is invalid.', (): void => {
      expect(isValidFileName('$%^*')).toBeFalsy();
    });
  });
});
