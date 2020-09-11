import { PassThrough } from 'stream';
import arrayifyStream from 'arrayify-stream';
import streamifyArray from 'streamify-array';
import { Representation } from '../ldp/representation/Representation';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { TEXT_TURTLE } from '../util/ContentTypes';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { CONTENT_TYPE } from '../util/UriConstants';
import { ensureTrailingSlash } from '../util/Util';
import { ResourceStore } from './ResourceStore';

/**
 * Resource store storing its data in an in-memory map.
 * Current Solid functionality support is quite basic: containers are not really supported for example.
 */
export class InMemoryResourceStore implements ResourceStore {
  private readonly store: { [id: string]: Representation };
  private readonly base: string;
  private index = 0;

  /**
   * @param base - Base that will be stripped of all incoming URIs
   *               and added to all outgoing ones to find the relative path.
   */
  public constructor(base: string) {
    this.base = ensureTrailingSlash(base);

    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: TEXT_TURTLE });
    this.store = {
      // Default root entry (what you get when the identifier is equal to the base)
      '': {
        binary: true,
        data: streamifyArray([]),
        metadata,
      },
    };
  }

  /**
   * Stores the incoming data under a new URL corresponding to `container.path + number`.
   * Slash added when needed.
   * @param container - The identifier to store the new data under.
   * @param representation - Data to store.
   *
   * @returns The newly generated identifier.
   */
  public async addResource(container: ResourceIdentifier, representation: Representation): Promise<ResourceIdentifier> {
    const containerPath = this.parseIdentifier(container);
    this.checkPath(containerPath);
    const newID = { path: `${ensureTrailingSlash(container.path)}${this.index}` };
    const newPath = this.parseIdentifier(newID);
    this.index += 1;
    this.store[newPath] = await this.copyRepresentation(representation);
    return newID;
  }

  /**
   * Deletes the given resource.
   * @param identifier - Identifier of resource to delete.
   */
  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    const path = this.parseIdentifier(identifier);
    this.checkPath(path);
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.store[path];
  }

  /**
   * Returns the stored representation for the given identifier.
   * Preferences will be ignored, data will be returned as it was received.
   *
   * @param identifier - Identifier to retrieve.
   *
   * @returns The corresponding Representation.
   */
  public async getRepresentation(identifier: ResourceIdentifier): Promise<Representation> {
    const path = this.parseIdentifier(identifier);
    this.checkPath(path);
    return this.generateRepresentation(path);
  }

  /**
   * @throws Not supported.
   */
  public async modifyResource(): Promise<void> {
    throw new Error('Not supported.');
  }

  /**
   * Puts the given data in the given location.
   * @param identifier - Identifier to replace.
   * @param representation - New Representation.
   */
  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation): Promise<void> {
    const path = this.parseIdentifier(identifier);
    this.store[path] = await this.copyRepresentation(representation);
  }

  /**
   * Strips the base from the identifier and checks if it is valid.
   * @param identifier - Incoming identifier.
   *
   * @throws {@link NotFoundHttpError}
   * If the identifier doesn't start with the base ID.
   *
   * @returns A string representing the relative path.
   */
  private parseIdentifier(identifier: ResourceIdentifier): string {
    const path = identifier.path.slice(this.base.length);
    if (!identifier.path.startsWith(this.base)) {
      throw new NotFoundHttpError();
    }
    return path;
  }

  /**
   * Checks if the relative path is in the store.
   * @param path - Incoming identifier.
   *
   * @throws {@link NotFoundHttpError}
   * If the path is not in the store.
   */
  private checkPath(path: string): void {
    if (!this.store[path]) {
      throw new NotFoundHttpError();
    }
  }

  /**
   * Copies the Representation by draining the original data stream and creating a new one.
   *
   * @param source - Incoming Representation.
   */
  private async copyRepresentation(source: Representation): Promise<Representation> {
    const arr = await arrayifyStream(source.data);
    return {
      binary: source.binary,
      data: streamifyArray([ ...arr ]),
      metadata: source.metadata,
    };
  }

  /**
   * Generates a Representation that is identical to the one stored,
   * but makes sure to duplicate the data stream so it stays readable for later calls.
   *
   * @param path - Path in store of Representation.
   *
   * @returns The resulting Representation.
   */
  private async generateRepresentation(path: string): Promise<Representation> {
    // Note: when converting to a complete ResourceStore and using readable-stream
    // object mode should be set correctly here (now fixed due to Node 10)
    const source = this.store[path];
    const objectMode = { writableObjectMode: true, readableObjectMode: true };
    const streamOutput = new PassThrough(objectMode);
    const streamInternal = new PassThrough({ ...objectMode, highWaterMark: Number.MAX_SAFE_INTEGER });
    source.data.pipe(streamOutput);
    source.data.pipe(streamInternal);

    source.data = streamInternal;

    return {
      binary: source.binary,
      data: streamOutput,
      metadata: source.metadata,
    };
  }
}
