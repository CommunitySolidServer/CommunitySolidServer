/* eslint-disable @typescript-eslint/naming-convention -- AWS S3 API uses capitalized keys */
import { Readable } from 'stream';
import type { CopyObjectCommandOutput, DeleteObjectCommandOutput, GetObjectCommandOutput, HeadObjectCommandOutput,
  ListObjectsV2CommandOutput, PutObjectCommandOutput, ServiceInputTypes, ServiceOutputTypes } from '@aws-sdk/client-s3';
import { MetadataDirective, S3ServiceException, S3 } from '@aws-sdk/client-s3';
import { DataFactory } from 'n3';
import type { Representation } from '../../http/representation/Representation.js';
import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import { ensureLeadingSlash, ensureTrailingSlash, isContainerIdentifier, joinUrl } from '../../util/PathUtil';
import { addResourceMetadata } from '../../util/ResourceUtil';
import { DC, HH, LDP, MA, RDF, XSD } from '../../util/Vocabularies';
import type { DataAccessor } from './DataAccessor';

/** Metadata useable with the S3 SDK */
interface S3Metadata {
  Metadata?: Record<string, string>;
  ContentType?: string;
  ContentLength?: number;
  LastModified?: Date;
}

/** The metadata header prefix. */
const s3prefix = 'x-amz-meta-';

/**
 * Transforms RepresentationMetadata to S3Metadata, quoting literals.
 * Note: header prefixes are added by the S3 SDK.
 */
function encodeMetadata(metadata: RepresentationMetadata): S3Metadata {
  const { contentType: ContentType, contentLength: ContentLength } = metadata;

  metadata.removeAll(MA.terms.format);
  metadata.removeAll(DC.terms.modified);
  metadata.removeAll(HH.terms['content-length']);
  metadata.remove(RDF.terms.type, LDP.terms.Resource);
  metadata.remove(RDF.terms.type, LDP.terms.Container);
  metadata.remove(RDF.terms.type, LDP.terms.BasicContainer);

  const Metadata = Object.fromEntries(metadata.quads().map(
    ({ predicate, object }): [string, string] => [
      encodeURIComponent(predicate.value),
      object.termType === 'Literal' ? `"${object.value}"` : object.value,
    ],
  ));

  return { Metadata, ContentType, ContentLength };
}

/**
 * Transforms S3Metadata to RepresentationMetadata,
 * removing header prefixes, and unquoting literals.
 */
function decodeMetadata(identifier: ResourceIdentifier, source: S3Metadata = {}): RepresentationMetadata {
  const metadata = new RepresentationMetadata(identifier);

  Object.entries(source.Metadata ?? {}).forEach(([ key, value ]): RepresentationMetadata => metadata.add(
    DataFactory.namedNode(decodeURIComponent(key.replace(s3prefix, ''))),
    value.startsWith('"') && value.endsWith('"') ?
      DataFactory.literal(value.slice(1, -1)) :
      DataFactory.namedNode(value),
  ));

  metadata.contentType = source.ContentType;
  metadata.contentLength = source.ContentLength;

  if (source.LastModified) {
    metadata.add(DC.terms.modified, DataFactory.literal(source.LastModified.toISOString(), XSD.terms.dateTime));
  }

  addResourceMetadata(metadata, isContainerIdentifier(identifier));

  return metadata;
}

/** Internal interface to the S3 SDK */
type Client = {
  [ command in 'head' | 'get' | 'put' | 'copy' | 'delete' ]: S3[`${command}Object`];
} & { list: S3['listObjectsV2'] };

/** Calls remote S3 using the S3 SDK, catching and transforming any exceptions. */
async function callSafe<
  In extends ServiceInputTypes,
  Out extends ServiceOutputTypes
>(call: (input: In) => Promise<Out>, args: In): Promise<Out> {
  try {
    return await call(args);
  } catch (reason: unknown) {
    if (reason instanceof S3ServiceException) {
      switch (reason.$response?.statusCode) {
        case 404: throw new NotFoundHttpError();
        default: throw new InternalServerError(
          `Something went wrong on the ${reason.$fault} side while calling S3. ${reason.name}: ${reason.message}`,
          { cause: reason, details: { method: call.name, args }, errorCode: `H${reason.$response?.statusCode}` },
        );
      }
    } else {
      throw new InternalServerError(
        `Something went wrong calling S3.`,
        { cause: reason, details: { method: call.name, args }},
      );
    }
  }
}

/** S3DataAccessor constructor arguments */
export interface S3Args {
  bucket: string;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * A DataAccessor that stores resource data in a Simple Storage Service (S3) backend.
 * Metadata is stored as S3 Metadata. Container structure is kept using S3 folders.
 */
export class S3DataAccessor implements DataAccessor {
  protected readonly logger = getLoggerFor(this);
  protected readonly client: Client;
  protected readonly bucket: string;
  protected readonly baseUrl: string;

  public constructor(baseUrl: string, args: S3Args) {
    this.baseUrl = ensureTrailingSlash(baseUrl);
    this.bucket = args.bucket;

    // The S3 client is not directly exposed to the class methods.
    // Instead, an exception-safe internal interface is constructed.
    const s3client = new S3(args);
    this.client = {
      copy: (params): Promise<CopyObjectCommandOutput> => callSafe(s3client.copyObject.bind(s3client), params),
      delete: (params): Promise<DeleteObjectCommandOutput> => callSafe(s3client.deleteObject.bind(s3client), params),
      get: (params): Promise<GetObjectCommandOutput> => callSafe(s3client.getObject.bind(s3client), params),
      head: (params): Promise<HeadObjectCommandOutput> => callSafe(s3client.headObject.bind(s3client), params),
      put: (params): Promise<PutObjectCommandOutput> => callSafe(s3client.putObject.bind(s3client), params),
      list: (params): Promise<ListObjectsV2CommandOutput> => callSafe(s3client.listObjectsV2.bind(s3client), params),
    };
  }

  /**
   * Only binary data can be sent to S3.
   */
  public async canHandle(representation: Representation): Promise<void> {
    if (!representation.binary) {
      throw new UnsupportedMediaTypeHttpError('Only binary data is supported.');
    }
  }

  // Forms an S3 object key for a ResourceIdentifier.
  protected objectFor(identifier: ResourceIdentifier): string {
    return ensureLeadingSlash(identifier.path.replace(this.baseUrl, ''));
  }

  // Combination of often-used S3 parameters.
  protected baseParams(identifier: ResourceIdentifier): { Bucket: string; Key: string } {
    return { Bucket: this.bucket, Key: this.objectFor(identifier) };
  }

  /**
   * Retrieves stream of the object corresponding to the identifier from S3.
   */
  public async getData(identifier: ResourceIdentifier): Promise<Guarded<Readable>> {
    this.logger.info(`Retrieving ${identifier.path}.`);

    const { Body } = await this.client.get(this.baseParams(identifier));

    if (!(Body instanceof Readable)) {
      throw new InternalServerError(`Cannot read content of ${identifier.path}.`);
    }

    return guardStream(Body);
  }

  /**
   * Retrieves and decodes the metadata corresponding to the identifier from S3.
   */
  public async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    this.logger.info(`Retrieving metadata for ${identifier.path}.`);

    return decodeMetadata(identifier, await this.client.head(this.baseParams(identifier)));
  }

  /**
   * Generates metadata for direct children of the identifier, based on their key prefix (i.e., path).
   */
  public async* getChildren(identifier: ResourceIdentifier): AsyncIterableIterator<RepresentationMetadata> {
    this.logger.info(`Getting children of ${identifier.path}.`);

    let params = {
      Bucket: this.bucket,
      Delimiter: '/',
      Prefix: this.objectFor(identifier),
      IsTruncated: undefined as boolean | undefined,
      ContinuationToken: undefined as string | undefined,
    };

    // Loop through all pages of results.
    do {
      const { Contents, CommonPrefixes, IsTruncated, NextContinuationToken } = await this.client.list(params);
      params = { ...params, IsTruncated, ContinuationToken: NextContinuationToken };

      // Yield (empty) folders under the prefix.
      for (const prefix of CommonPrefixes ?? []) {
        const path = joinUrl(this.baseUrl, prefix.Prefix ?? '');
        yield decodeMetadata({ path });
      }

      // Yield objects under the prefix.
      for (const object of Contents ?? []) {
        const path = joinUrl(this.baseUrl, object.Key ?? '');
        if (path !== identifier.path) {
          yield decodeMetadata({ path }, object);
        }
      }
    } while (params.IsTruncated);
  }

  /**
   * Writes metadata to the S3 object corresponding to the identifier,
   * by copying the existing object and replacing the metadata.
   */
  public async writeMetadata(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    this.logger.info(`Writing metadata for ${identifier.path}.`);

    await this.client.copy({
      CopySource: `${this.bucket}/${this.objectFor(identifier)}`,
      MetadataDirective: MetadataDirective.REPLACE,
      ...this.baseParams(identifier),
      ...encodeMetadata(metadata),
    });
  }

  /**
   * Writes a document as a new object to S3.
   * The upload command is used instead of a simple PUT, because it allows empty and multipart bodies.
   */
  public async writeDocument(
    identifier: ResourceIdentifier, data: Guarded<Readable>, metadata: RepresentationMetadata,
  ): Promise<void> {
    this.logger.info(`Writing document ${identifier.path}.`);
    this.logger.info(`Before ${identifier.path}`);
    await this.client.put({ ...this.baseParams(identifier), ...encodeMetadata(metadata), Body: data });
    this.logger.info(`After ${identifier.path}`);
  }

  /**
   * Writes a container as a new object to S3.
   * All objects ending with a slash are automatically treated as folders.
   */
  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    this.logger.info(`Writing container ${identifier.path}.`);

    await this.client.put({ ...this.baseParams(identifier), ...encodeMetadata(metadata), Body: '' });
  }

  /**
   * Deletes the object corresponding to the identifier from S3.
   */
  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    this.logger.info(`Deleting ${identifier.path}.`);

    await this.client.delete(this.baseParams(identifier));
  }
}

