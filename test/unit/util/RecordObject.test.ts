import { RecordObject } from '../../../src/util/RecordObject';

describe('RecordObject', (): void => {
  it('returns an empty record when created without parameters.', async(): Promise<void> => {
    expect(new RecordObject()).toStrictEqual({});
  });

  it('returns the passed record.', async(): Promise<void> => {
    const record = { abc: 'def' };
    expect(new RecordObject(record)).toBe(record);
  });
});
