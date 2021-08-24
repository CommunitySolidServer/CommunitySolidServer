import { stringify } from 'querystring';
import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import { FormToJsonConverter } from '../../../../src/storage/conversion/FormToJsonConverter';
import { readableToString } from '../../../../src/util/StreamUtil';

describe('A FormToJsonConverter', (): void => {
  const identifier = { path: 'http://test.com/foo' };
  const converter = new FormToJsonConverter();

  it('supports going from form data to json.', async(): Promise<void> => {
    await expect(converter.getInputTypes()).resolves.toEqual({ 'application/x-www-form-urlencoded': 1 });
    await expect(converter.getOutputTypes()).resolves.toEqual({ 'application/json': 1 });
  });

  it('converts form data to JSON.', async(): Promise<void> => {
    const formData = stringify({ field: 'value' });
    const representation = new BasicRepresentation(formData, 'application/x-www-form-urlencoded');
    const result = await converter.handle({ identifier, representation, preferences: {}});
    expect(result.metadata.contentType).toBe('application/json');
    expect(JSON.parse(await readableToString(result.data))).toEqual({ field: 'value' });
  });
});
