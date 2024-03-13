/**
 * A JSON object.
 */
export type Json = string | number | boolean | NodeJS.Dict<Json> | Json[];
