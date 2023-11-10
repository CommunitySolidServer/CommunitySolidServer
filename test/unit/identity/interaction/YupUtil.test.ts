import { boolean, number, object, string } from 'yup';
import { parseSchema, URL_SCHEMA, validateWithError } from '../../../../src/identity/interaction/YupUtil';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';

describe('YupUtil', (): void => {
  describe('#URL_SCHEMA', (): void => {
    it('validates URLs.', async(): Promise<void> => {
      await expect(URL_SCHEMA.isValid('https://example.com/foo')).resolves.toBe(true);
      await expect(URL_SCHEMA.isValid('http://localhost:3000/foo')).resolves.toBe(true);
      await expect(URL_SCHEMA.isValid('apple')).resolves.toBe(false);
      await expect(URL_SCHEMA.isValid('mail@example.com')).resolves.toBe(false);
      await expect(URL_SCHEMA.isValid('')).resolves.toBe(true);
      await expect(URL_SCHEMA.isValid(null)).resolves.toBe(false);
    });
  });

  describe('#parseSchema', (): void => {
    it('creates representations for yup schemas.', async(): Promise<void> => {
      const schema = object({
        optStr: string(),
        reqStr: string().required(),
        numb: number(),
        bool: boolean(),
        obj: object({
          key: string().required(),
          obj2: object({
            nested: number(),
          }),
        }).required(),
      });
      expect(parseSchema(schema)).toEqual({ fields: {
        optStr: { type: 'string', required: false },
        reqStr: { type: 'string', required: true },
        numb: { type: 'number', required: false },
        bool: { type: 'boolean', required: false },
        obj: {
          type: 'object',
          required: true,
          fields: {
            key: { type: 'string', required: true },
            obj2: {
              type: 'object',
              required: false,
              fields: {
                nested: { type: 'number', required: false },
              },
            },
          },
        },
      }});
    });
  });

  describe('#validateWithError', (): void => {
    it('throws a BadRequestHttpError if there is an error.', async(): Promise<void> => {
      const schema = object({});
      await expect(validateWithError(schema, { test: 'data' })).resolves.toEqual({ test: 'data' });
      await expect(validateWithError(schema, 'test')).rejects.toThrow(BadRequestHttpError);
    });
  });
});
