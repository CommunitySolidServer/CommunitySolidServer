import { Readable } from 'stream';
import { KeysRdfParseJsonLd } from '@comunica/context-entries';
import { parse, toSeconds } from 'iso8601-duration';
import type { Store } from 'n3';
import type { NamedNode, Term } from 'rdf-js';
import rdfParser from 'rdf-parse';
import SHACLValidator from 'rdf-validate-shacl';
import { v4 } from 'uuid';
import type { Credentials } from '../../authentication/Credentials';
import type { AccessMap } from '../../authorization/permissions/Permissions';
import { AccessMode } from '../../authorization/permissions/Permissions';
import { ContextDocumentLoader } from '../../storage/conversion/ConversionUtil';
import { UnprocessableEntityHttpError } from '../../util/errors/UnprocessableEntityHttpError';
import { IdentifierSetMultiMap } from '../../util/map/IdentifierMap';
import { readableToQuads } from '../../util/StreamUtil';
import { msToDuration } from '../../util/StringUtil';
import { NOTIFY, RDF, XSD } from '../../util/Vocabularies';
import { CONTEXT_NOTIFICATION } from './Notification';
import type { NotificationChannel } from './NotificationChannel';
import type { NotificationChannelType } from './NotificationChannelType';
import { DEFAULT_NOTIFICATION_FEATURES } from './NotificationDescriber';

/**
 * Helper type used to store information about the default features.
 */
type Feature = {
  predicate: NamedNode;
  key: keyof NotificationChannel;
  dataType: string;
};

/**
 * All the necessary fields of the default features that are possible for all Notification Channels.
 */
const featureDefinitions: Feature[] = [
  { predicate: NOTIFY.terms.accept, key: 'accept', dataType: XSD.string },
  { predicate: NOTIFY.terms.endAt, key: 'endAt', dataType: XSD.dateTime },
  { predicate: NOTIFY.terms.rate, key: 'rate', dataType: XSD.duration },
  { predicate: NOTIFY.terms.startAt, key: 'startAt', dataType: XSD.dateTime },
  { predicate: NOTIFY.terms.state, key: 'state', dataType: XSD.string },
];

// This context is slightly outdated but seems to be the only "official" source for a SHACL context.
const CONTEXT_SHACL = 'https://w3c.github.io/shacl/shacl-jsonld-context/shacl.context.ld.json';
/**
 * The SHACL shape for the minimum requirements on a notification channel subscription request.
 */
export const DEFAULT_SUBSCRIPTION_SHACL = {
  '@context': [ CONTEXT_SHACL ],
  '@type': 'sh:NodeShape',
  // Use the topic predicate to find the focus node
  targetSubjectsOf: NOTIFY.topic,
  closed: true,
  property: [
    { path: RDF.type, minCount: 1, maxCount: 1, nodeKind: 'sh:IRI' },
    { path: NOTIFY.topic, minCount: 1, maxCount: 1, nodeKind: 'sh:IRI' },
    ...featureDefinitions.map((feat): unknown =>
      ({ path: feat.predicate.value, maxCount: 1, datatype: feat.dataType })),
  ],
} as const;

/**
 * A {@link NotificationChannelType} that handles the base case of parsing and serializing a notification channel.
 * Note that the `extractModes` call always requires Read permissions on the target resource.
 *
 * Uses SHACL to validate the incoming data in `initChannel`.
 * Classes extending this can pass extra SHACL properties in the constructor to extend the validation check.
 *
 * The `completeChannel` implementation is an empty function.
 */
export abstract class BaseChannelType implements NotificationChannelType {
  protected readonly type: NamedNode;
  protected readonly shacl: unknown;
  protected shaclQuads?: Store;

  /**
   * @param type - The URI of the notification channel type.
   *               This will be added to the SHACL shape to validate incoming subscription data.
   * @param additionalShaclProperties - Any additional properties that need to be added to the default SHACL shape.
   */
  protected constructor(type: NamedNode, additionalShaclProperties: unknown[] = []) {
    this.type = type;

    // Inject requested properties into default SHACL shape
    this.shacl = {
      ...DEFAULT_SUBSCRIPTION_SHACL,
      property: [
        ...DEFAULT_SUBSCRIPTION_SHACL.property,
        // Add type check
        { path: RDF.type, hasValue: { '@id': type.value }},
        ...additionalShaclProperties,
      ],
    };
  }

  /**
   * Initiates the channel by first calling {@link validateSubscription} followed by {@link quadsToChannel}.
   * Subclasses can override either function safely to impact the result of the function.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initChannel(data: Store, credentials: Credentials): Promise<NotificationChannel> {
    const subject = await this.validateSubscription(data);
    return this.quadsToChannel(data, subject);
  }

  /**
   * Returns an N3.js {@link Store} containing quads corresponding to the stored SHACL representation.
   * Caches this result so the conversion from JSON-LD to quads only has to happen once.
   */
  protected async getShaclQuads(): Promise<Store> {
    if (!this.shaclQuads) {
      const shaclStream = rdfParser.parse(
        Readable.from(JSON.stringify(this.shacl)),
        {
          contentType: 'application/ld+json',
          // Make sure our internal version of the context gets used
          [KeysRdfParseJsonLd.documentLoader.name]: new ContextDocumentLoader({
            [CONTEXT_SHACL]: '@css:templates/contexts/shacl.jsonld',
          }),
        },
      );
      this.shaclQuads = await readableToQuads(shaclStream);
    }
    return this.shaclQuads;
  }

  /**
   * Validates whether the given data conforms to the stored SHACL shape.
   * Will throw an {@link UnprocessableEntityHttpError} if validation fails.
   * Along with the SHACL check, this also makes sure there is only one matching entry in the dataset.
   *
   * @param data - The data to validate.
   *
   * @returns The focus node that corresponds to the subject of the found notification channel description.
   */
  protected async validateSubscription(data: Store): Promise<Term> {
    // Need to make sure there is exactly one matching entry, which can't be done with SHACL.
    // The predicate used here must be the same as is used for `targetSubjectsOf` in the SHACL shape.
    const focusNodes = data.getSubjects(NOTIFY.terms.topic, null, null);
    if (focusNodes.length === 0) {
      throw new UnprocessableEntityHttpError('Missing topic value.');
    }
    if (focusNodes.length > 1) {
      throw new UnprocessableEntityHttpError('Only one subscription can be done at the same time.');
    }

    const validator = new SHACLValidator(await this.getShaclQuads());
    const report = validator.validate(data);

    if (!report.conforms) {
      // Use the first error to generate error message
      const result = report.results[0];
      const message = result.message[0];
      throw new UnprocessableEntityHttpError(`${message.value} - ${result.path?.value}`);
    }

    // From this point on, we can assume the subject corresponds to a valid subscription request
    return focusNodes[0] as NamedNode;
  }

  /**
   * Converts a set of quads to a {@link NotificationChannel}.
   * Assumes the data is valid, so this should be called after {@link validateSubscription}
   *
   * The values of the default features will be added to the resulting channel,
   * subclasses with additional features that need to be added are responsible for parsing those quads.
   *
   * @param data - Data to convert.
   * @param subject - The identifier of the notification channel description in the dataset.
   *
   * @returns The generated {@link NotificationChannel}.
   */
  protected async quadsToChannel(data: Store, subject: Term): Promise<NotificationChannel> {
    const topic = data.getObjects(subject, NOTIFY.terms.topic, null)[0] as NamedNode;
    const type = data.getObjects(subject, RDF.terms.type, null)[0] as NamedNode;

    const channel: NotificationChannel = {
      id: `${v4()}:${topic.value}`,
      type: type.value,
      topic: topic.value,
    };

    // Apply the values for all present features that are enabled
    for (const feature of DEFAULT_NOTIFICATION_FEATURES) {
      const objects = data.getObjects(subject, feature, null);
      if (objects.length === 1) {
        // Will always succeed since we are iterating over a list which was built using `featureDefinitions`
        const { dataType, key } = featureDefinitions.find((feat): boolean => feat.predicate.value === feature)!;
        let val: string | number = objects[0].value;
        if (dataType === XSD.dateTime) {
          val = Date.parse(val);
        } else if (dataType === XSD.duration) {
          val = toSeconds(parse(val)) * 1000;
        }
        // Need to convince TS that we can assign `string | number` to this key
        (channel as Record<typeof key, string | number>)[key] = val;
      }
    }

    return channel;
  }

  /**
   * Converts the given channel to a JSON-LD description.
   * All fields found in the channel, except `lastEmit`, will be part of the result subject,
   * so subclasses should remove any fields that should not be exposed.
   */
  public async toJsonLd(channel: NotificationChannel): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {
      '@context': [
        CONTEXT_NOTIFICATION,
      ],
      ...channel,
    };
    // No need to expose this field
    delete result.lastEmit;

    // Convert all the epoch values back to the expected date/rate format
    for (const { key, dataType } of featureDefinitions) {
      const value = channel[key];
      if (value) {
        if (dataType === XSD.dateTime) {
          result[key] = new Date(value).toISOString();
        } else if (dataType === XSD.duration) {
          result[key] = msToDuration(value as number);
        }
      }
    }

    return result;
  }

  public async extractModes(channel: NotificationChannel): Promise<AccessMap> {
    return new IdentifierSetMultiMap<AccessMode>([[{ path: channel.topic }, AccessMode.read ]]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async completeChannel(channel: NotificationChannel): Promise<void> {
    // Do nothing
  }
}
