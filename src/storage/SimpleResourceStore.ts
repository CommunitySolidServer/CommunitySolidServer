import arrayifyStream from 'arrayify-stream';
import { DATA_TYPE_BINARY } from '../util/ContentTypes';
import { ensureTrailingSlash } from '../util/Util';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { Representation } from '../ldp/representation/Representation';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ResourceStore } from './ResourceStore';
import streamifyArray from 'streamify-array';

/**
 * Resource store storing its data in an in-memory map.
 * All requests will throw an {@link NotFoundHttpError} if unknown identifiers get passed.
 */
export class SimpleResourceStore implements ResourceStore {
  private readonly store: { [id: string]: Representation };
  private readonly base: string;
  private index = 0;

  /**
   * @param base - Will be stripped of all incoming URIs and added to all outgoing ones to find the relative path.
   */
  public constructor(base: string) {
    this.base = base;

    this.store = {
      // Default root entry (what you get when the identifier is equal to the base)
      '': {
        dataType: DATA_TYPE_BINARY,
        data: streamifyArray([]),
        metadata: { raw: [], profiles: []},
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
   * @param identifier - Incoming identifier.
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
   * @param data - Incoming Representation.
   */
  private async copyRepresentation(source: Representation): Promise<Representation> {
    const arr = await arrayifyStream(source.data);
    return {
      dataType: source.dataType,
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
    const source = this.store[path];
    const arr = await arrayifyStream(source.data);
    source.data = streamifyArray([ ...arr ]);

    return {
      dataType: source.dataType,
      data: streamifyArray([ ...arr ]),
      metadata: source.metadata,
    };
  }
}
