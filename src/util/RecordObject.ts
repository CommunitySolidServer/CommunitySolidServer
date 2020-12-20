/**
 * Helper class for instantiating multiple objects with Components.js.
 * See https://github.com/LinkedSoftwareDependencies/Components.js/issues/26
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RecordObject implements Record<string, any> {
  public constructor(record: Record<string, string> = {}) {
    // eslint-disable-next-line no-constructor-return
    return record;
  }
}
