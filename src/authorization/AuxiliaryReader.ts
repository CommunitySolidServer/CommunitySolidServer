import type { AuxiliaryStrategy } from '../http/auxiliary/AuxiliaryStrategy';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import { IdentifierMap, IdentifierSetMultiMap } from '../util/map/IdentifierMap';
import type { MapEntry } from '../util/map/MapUtil';
import { modify } from '../util/map/MapUtil';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { AccessMap, AccessMode, PermissionMap } from './permissions/Permissions';

/**
 * Determines the permissions of auxiliary resources by finding those of the corresponding subject resources.
 */
export class AuxiliaryReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  private readonly reader: PermissionReader;
  private readonly auxiliaryStrategy: AuxiliaryStrategy;

  public constructor(reader: PermissionReader, auxiliaryStrategy: AuxiliaryStrategy) {
    super();
    this.reader = reader;
    this.auxiliaryStrategy = auxiliaryStrategy;
  }

  public async handle({ requestedModes, credentials }: PermissionReaderInput): Promise<PermissionMap> {
    // Finds all the dependent auxiliary identifiers
    const auxiliaries = this.findAuxiliaries(requestedModes);

    // Replaces the dependent auxiliary identifies with the corresponding subject identifiers
    const updatedMap = modify(
      new IdentifierSetMultiMap(requestedModes),
      { add: auxiliaries.values(), remove: auxiliaries.keys() },
    );
    const result = await this.reader.handleSafe({ requestedModes: updatedMap, credentials });

    // Extracts the auxiliary permissions based on the subject permissions
    for (const [ identifier, [ subject ]] of auxiliaries) {
      this.logger.debug(`Mapping ${subject.path} permissions to ${identifier.path}`);
      result.set(identifier, result.get(subject) ?? {});
    }
    return result;
  }

  /**
   * Maps auxiliary resources that do not have their own authorization checks to their subject resource.
   */
  private findAuxiliaries(requestedModes: AccessMap): IdentifierMap<MapEntry<AccessMap>> {
    const auxiliaries = new IdentifierMap<[ResourceIdentifier, ReadonlySet<AccessMode>]>();
    for (const [ identifier, modes ] of requestedModes.entrySets()) {
      if (this.isDependentAuxiliary(identifier)) {
        auxiliaries.set(identifier, [ this.auxiliaryStrategy.getSubjectIdentifier(identifier), modes ]);
      }
    }
    return auxiliaries;
  }

  /**
   * Checks if the identifier is an auxiliary resource that uses subject permissions.
   */
  private isDependentAuxiliary(identifier: ResourceIdentifier): boolean {
    return this.auxiliaryStrategy.isAuxiliaryIdentifier(identifier) &&
      !this.auxiliaryStrategy.usesOwnAuthorization(identifier);
  }
}
