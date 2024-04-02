import { string } from 'yup';
import type { AnyObject, Maybe, ObjectSchema, Schema, ValidateOptions } from 'yup';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import type { Json } from '../../util/Json';
import { isUrl } from '../../util/StringUtil';
import Dict = NodeJS.Dict;

type BaseObjectSchema = ObjectSchema<Maybe<AnyObject>>;

// The builtin `url` validator of `yup` does not support localhost URLs, so we create a custom one here.
// We validate the WebID URL to prevent generation of invalid ACL,
// which would break the pod creation, causing us to have an incomplete pod.
export const URL_SCHEMA = string().trim().optional().test({
  name: 'url',
  message: (value: { value: string }): string => `"${value.value}" is not a valid URL`,
  test(value): boolean {
    if (!value) {
      return true;
    }
    return isUrl(value);
  },
});

function isObjectSchema(schema: Schema): schema is BaseObjectSchema {
  return schema.type === 'object';
}

// `T` can't extend Schema since it could also be a Reference, which is a type `yup` doesn't export
type SchemaType<T> = T extends BaseObjectSchema ? ObjectType<T> : { required: boolean; type: string };
// The type of the fields in an object schema
type FieldType<T extends BaseObjectSchema> = T extends { fields: Record<infer R, unknown> } ? R : never;
// Simplified type we use to represent yup objects
type ObjectType<T extends BaseObjectSchema> =
  { required: boolean; type: 'object'; fields: {[ K in FieldType<T> ]: SchemaType<T['fields'][K]> }};

/**
 * Recursive function used when generating yup schema representations.
 */
function parseSchemaDescription<T extends Schema>(schema: T): SchemaType<T> {
  const result: Dict<Json> = { required: !schema.spec.optional, type: schema.type };
  if (isObjectSchema(schema)) {
    result.fields = {};
    for (const [ field, description ] of Object.entries(schema.fields)) {
      // We never use references so this cast is fine
      result.fields[field] = parseSchemaDescription(description as Schema);
    }
  }
  return result as SchemaType<T>;
}

/**
 * Generates a simplified representation of a yup schema.
 */
export function parseSchema<T extends BaseObjectSchema>(schema: T): Pick<SchemaType<T>, 'fields'> {
  const result = parseSchemaDescription(schema);
  return { fields: result.fields };
}

/**
 * Same functionality as the yup validate function, but throws a {@link BadRequestHttpError} if there is an error.
 */
export async function validateWithError<T extends BaseObjectSchema>(
  schema: T,
  data: unknown,
  options?: ValidateOptions<AnyObject>,
): Promise<T['__outputType']> {
  try {
    return await schema.validate(data, options);
  } catch (error: unknown) {
    throw new BadRequestHttpError(createErrorMessage(error));
  }
}
