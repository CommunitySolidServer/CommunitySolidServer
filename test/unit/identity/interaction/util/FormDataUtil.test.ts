import {
  getFormDataRequestBody,
} from '../../../../../src/identity/interaction/util/FormDataUtil';

describe('FormDataUtil', (): void => {
  it('satisfies a trivial use case.', async(): Promise<void> => {
    expect(getFormDataRequestBody).toBeDefined();
  });
});
