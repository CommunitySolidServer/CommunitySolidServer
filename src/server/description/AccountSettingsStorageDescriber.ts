import type { NamedNode, Quad, Quad_Object, Term } from '@rdfjs/types';
import { DataFactory } from 'n3';
import { stringToTerm } from 'rdf-string';
import { StorageDescriber } from './StorageDescriber';
import quad = DataFactory.quad;
import namedNode = DataFactory.namedNode;
import type { AccountStore, AccountSettings } from '../../identity/interaction/account/util/AccountStore';
import type { PodStore } from '../../identity/interaction/pod/util/PodStore';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';

/**
 * Adds triples to the storage description resource, based on the settings of
 * the account that created the storage. 
 * 
 * The resource identifier of the storage is used as subject.
 */
export class AccountSettingsStorageDescriber extends StorageDescriber {
  private readonly terms: ReadonlyMap<NamedNode, keyof AccountSettings>;

  public constructor(
    private podStore: PodStore,
    private accountStore: AccountStore,
    terms: Record<string, keyof AccountSettings>,
  ) {
    super();
    
    const termMap = new Map<NamedNode, keyof AccountSettings>();
    for (const [ predicate, settingsKey ] of Object.entries(terms)) {
    
      const predTerm = stringToTerm(predicate);
      if (predTerm.termType !== 'NamedNode') {
        throw new Error('Predicate needs to be a named node.');
      }
      
      termMap.set(predTerm, settingsKey);
    }

    this.terms = termMap;
  }

  public async handle(target: ResourceIdentifier): Promise<Quad[]> {
    const subject = namedNode(target.path);
    const pod = await this.podStore.findByBaseUrl(target.path);
    if (!pod) throw new Error(`Cannot find pod for storage path ${target.path}`);

    const quads: Quad[] = [];
    for await (const quad of this.generateTriples(subject, pod.accountId)) {
      quads.push(quad);
    }

    return quads;
  }

  private async* generateTriples(subject: NamedNode, account: string): AsyncGenerator<Quad> {
    
    for (const [ predicate, settingsKey ] of this.terms.entries()) {

      const settingsValue = await this.accountStore.getSetting(account, settingsKey);
      if (settingsValue === undefined) continue;

      const objects = (Array.isArray(settingsValue) ? settingsValue : [ settingsValue ]).map((value): Quad_Object => {
        let term: Term;

        try {
          term = stringToTerm(`${value}`);
        } catch {
          term = stringToTerm(`"${value}"`);
        }

        return term as Quad_Object;
      });

      for (const object of objects) {
        yield quad(subject, predicate, object);
      }
    }
  }
}
