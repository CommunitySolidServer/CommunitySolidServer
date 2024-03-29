/**
 * Helper class for instantiating multiple objects with Components.js.
 * See https://github.com/LinkedSoftwareDependencies/Components.js/issues/26
 */
export class RecordObject implements Record<string, unknown> {
  public constructor(record: Record<string, unknown> = {}) {
    // eslint-disable-next-line no-constructor-return
    return record;
  }

  [key: string]: unknown;
}
