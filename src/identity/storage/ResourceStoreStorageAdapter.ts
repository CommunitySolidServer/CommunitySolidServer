import type { Adapter, AdapterPayload } from 'oidc-provider';
import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../storage/ResourceStore';
import { APPLICATION_OCTET_STREAM, TEXT_TURTLE } from '../../util/ContentTypes';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { ensureTrailingSlash } from '../../util/PathUtil';

export class ResourceStoreStorageAdapter implements Adapter {
  private readonly baseUrl: string;
  private readonly store: ResourceStore;

  public constructor(baseUrl: string, idpResourcePrefix: string, store: ResourceStore) {
    this.baseUrl = `${ensureTrailingSlash(baseUrl)}${idpResourcePrefix}`;
    this.store = store;
  }

  private static epochTime(): number {
    return Math.floor(Date.now() / 1000);
  }

  private resourceIdentifier(id: string): ResourceIdentifier {
    return { path: `${this.baseUrl}${id}` };
  }

  private grantKeyFor(id: string): ResourceIdentifier {
    return this.resourceIdentifier(`grant:${id}`);
  }

  private sessionUidKeyFor(id: string): ResourceIdentifier {
    return this.resourceIdentifier(`sessionUid:${id}`);
  }

  private userCodeKeyFor(id: string): ResourceIdentifier {
    return this.resourceIdentifier(`userCode:${id}`);
  }

  public async consume(id: string): Promise<undefined | void> {
    const resource = this.resourceIdentifier(id);
    const x = `<${resource.path}> <p> "${ResourceStoreStorageAdapter.epochTime()}"`;
    await this.store.setRepresentation(this.resourceIdentifier(id), new BasicRepresentation(x, resource, TEXT_TURTLE));
  }

  public async destroy(id: string): Promise<undefined | void> {
    await this.store.deleteResource(this.resourceIdentifier(id));
  }

  public async find(id: string): Promise<AdapterPayload | undefined | void> {
    const representation: Representation = await this.store.getRepresentation(this.resourceIdentifier(id), {});

    const resource = await new Promise<string>((resolve, reject): void => {
      let potentialResource = '';
      representation.data.on('data', (data): void => {
        potentialResource += data.toString();
      });
      representation.data.on('end', (): void => resolve(potentialResource));
      representation.data.on('error', reject);
    });

    return JSON.parse(resource) as AdapterPayload | undefined;
  }

  public async findByUid(uid: string): Promise<AdapterPayload | undefined | void> {
    const id = (await this.store.getRepresentation(this.sessionUidKeyFor(uid), {})).data.read.toString();
    return this.find(id);
  }

  public async findByUserCode(userCode: string): Promise<AdapterPayload | undefined | void> {
    const id = (await this.store.getRepresentation(this.userCodeKeyFor(userCode), {})).data.read.toString();
    return this.find(id);
  }

  public async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<undefined | void> {
    const resourceIdentifier: ResourceIdentifier = this.resourceIdentifier(id);

    // if (this.model === 'Session') {
    //   this.lru.set(InMemoryIdPStorageAdapter.sessionUidKeyFor(payload.uid as string), id, expiresIn * 1000);
    // }

    // const { grantId, userCode } = payload;
    // if (grantId) {
    //   const grantKey = InMemoryIdPStorageAdapter.grantKeyFor(grantId);
    //   const grant = this.lru.get(grantKey);
    //   if (!grant) {
    //     this.lru.set(grantKey, [ key ]);
    //   } else {
    //     (grant as string[]).push(key);
    //   }
    // }

    // if (userCode) {
    //   this.lru.set(InMemoryIdPStorageAdapter.userCodeKeyFor(userCode), id, expiresIn * 1000);
    // }

    // this.lru.set(key, payload, expiresIn * 1000);
    await this.store.setRepresentation(
      resourceIdentifier,
      new BasicRepresentation(JSON.stringify(payload), resourceIdentifier, APPLICATION_OCTET_STREAM),
    );
  }

  public async revokeByGrantId(grantId: string): Promise<undefined | void> {
    // const grantKey = InMemoryIdPStorageAdapter.grantKeyFor(grantId);
    // const grant = this.lru.get(grantKey);
    // if (grant) {
    //   (grant as string[]).forEach((token): void => this.lru.del(token));
    //   this.lru.del(grantKey);
    // }
    throw new NotImplementedHttpError();
  }
}
