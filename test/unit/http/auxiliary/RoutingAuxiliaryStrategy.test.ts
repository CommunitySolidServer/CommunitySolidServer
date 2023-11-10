import type { AuxiliaryStrategy } from '../../../../src/http/auxiliary/AuxiliaryStrategy';
import { RoutingAuxiliaryStrategy } from '../../../../src/http/auxiliary/RoutingAuxiliaryStrategy';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

class SimpleSuffixStrategy implements AuxiliaryStrategy {
  private readonly suffix: string;

  public constructor(suffix: string) {
    this.suffix = suffix;
  }

  public usesOwnAuthorization(): boolean {
    return true;
  }

  public getAuxiliaryIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: `${identifier.path}${this.suffix}` };
  }

  public getAuxiliaryIdentifiers(identifier: ResourceIdentifier): ResourceIdentifier[] {
    return [ this.getAuxiliaryIdentifier(identifier) ];
  }

  public isAuxiliaryIdentifier(identifier: ResourceIdentifier): boolean {
    return identifier.path.endsWith(this.suffix);
  }

  public getSubjectIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: identifier.path.slice(0, -this.suffix.length) };
  }

  public isRequiredInRoot(): boolean {
    return true;
  }

  public async addMetadata(): Promise<void> {
    // Empty fn
  }

  public async validate(): Promise<void> {
    // Always validates
  }
}

describe('A RoutingAuxiliaryStrategy', (): void => {
  let sources: SimpleSuffixStrategy[];
  let strategy: RoutingAuxiliaryStrategy;
  const baseId = { path: 'http://test.com/foo' };
  const dummy1Id = { path: 'http://test.com/foo.dummy1' };
  const dummy2Id = { path: 'http://test.com/foo.dummy2' };
  const dummy3Id = { path: 'http://test.com/foo.dummy3' };

  beforeEach(async(): Promise<void> => {
    sources = [
      new SimpleSuffixStrategy('.dummy1'),
      new SimpleSuffixStrategy('.dummy2'),
    ];
    strategy = new RoutingAuxiliaryStrategy(sources);
  });

  it('#addMetadata adds the metadata of all sources for the base identifier.', async(): Promise<void> => {
    jest.spyOn(sources[0], 'addMetadata').mockImplementation();
    jest.spyOn(sources[1], 'addMetadata').mockImplementation();
    const metadata = new RepresentationMetadata(baseId);
    await expect(strategy.addMetadata(metadata)).resolves.toBeUndefined();
    expect(sources[0].addMetadata).toHaveBeenCalledTimes(1);
    expect(sources[0].addMetadata).toHaveBeenLastCalledWith(metadata);
    expect(sources[1].addMetadata).toHaveBeenCalledTimes(1);
    expect(sources[1].addMetadata).toHaveBeenLastCalledWith(metadata);
  });

  it('#addMetadata adds the metadata of the correct source for auxiliary identifiers.', async(): Promise<void> => {
    jest.spyOn(sources[0], 'addMetadata').mockImplementation();
    jest.spyOn(sources[1], 'addMetadata').mockImplementation();
    const metadata = new RepresentationMetadata(dummy2Id);
    await expect(strategy.addMetadata(metadata)).resolves.toBeUndefined();
    expect(sources[0].addMetadata).toHaveBeenCalledTimes(0);
    expect(sources[1].addMetadata).toHaveBeenCalledTimes(1);
    expect(sources[1].addMetadata).toHaveBeenLastCalledWith(metadata);
  });

  it('#usesOwnAuthorization returns the result of the correct source.', async(): Promise<void> => {
    jest.spyOn(sources[0], 'usesOwnAuthorization').mockImplementation();
    jest.spyOn(sources[1], 'usesOwnAuthorization').mockImplementation();
    strategy.usesOwnAuthorization(dummy2Id);
    expect(sources[0].usesOwnAuthorization).toHaveBeenCalledTimes(0);
    expect(sources[1].usesOwnAuthorization).toHaveBeenCalledTimes(1);
    expect(sources[1].usesOwnAuthorization).toHaveBeenLastCalledWith(dummy2Id);
  });

  it('#isRequiredInRoot returns the result of the correct source.', async(): Promise<void> => {
    jest.spyOn(sources[0], 'isRequiredInRoot').mockImplementation();
    jest.spyOn(sources[1], 'isRequiredInRoot').mockImplementation();
    strategy.isRequiredInRoot(dummy2Id);
    expect(sources[0].isRequiredInRoot).toHaveBeenCalledTimes(0);
    expect(sources[1].isRequiredInRoot).toHaveBeenCalledTimes(1);
    expect(sources[1].isRequiredInRoot).toHaveBeenLastCalledWith(dummy2Id);
  });

  it('#validates using the correct validator.', async(): Promise<void> => {
    jest.spyOn(sources[0], 'validate').mockImplementation();
    jest.spyOn(sources[1], 'validate').mockImplementation();

    let metadata = new RepresentationMetadata(dummy1Id);
    await expect(strategy.validate({ metadata } as any)).resolves.toBeUndefined();
    expect(sources[0].validate).toHaveBeenCalledTimes(1);
    expect(sources[1].validate).toHaveBeenCalledTimes(0);

    metadata = new RepresentationMetadata(dummy2Id);
    await expect(strategy.validate({ metadata } as any)).resolves.toBeUndefined();
    expect(sources[0].validate).toHaveBeenCalledTimes(1);
    expect(sources[1].validate).toHaveBeenCalledTimes(1);

    metadata = new RepresentationMetadata(dummy3Id);
    await expect(strategy.validate({ metadata } as any)).rejects.toThrow(NotImplementedHttpError);
  });
});
