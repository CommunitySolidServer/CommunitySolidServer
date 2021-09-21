import type { AuxiliaryIdentifierStrategy } from '../../../../src/ldp/auxiliary/AuxiliaryIdentifierStrategy';
import { ComposedAuxiliaryStrategy } from '../../../../src/ldp/auxiliary/ComposedAuxiliaryStrategy';
import type { MetadataGenerator } from '../../../../src/ldp/auxiliary/MetadataGenerator';
import type { Validator } from '../../../../src/ldp/auxiliary/Validator';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';

describe('A ComposedAuxiliaryStrategy', (): void => {
  const identifier = { path: 'http://test.com/foo' };
  let identifierStrategy: AuxiliaryIdentifierStrategy;
  let metadataGenerator: MetadataGenerator;
  let validator: Validator;
  let strategy: ComposedAuxiliaryStrategy;

  beforeEach(async(): Promise<void> => {
    identifierStrategy = {
      getAuxiliaryIdentifier: jest.fn(),
      getAuxiliaryIdentifiers: jest.fn(),
      getAssociatedIdentifier: jest.fn(),
      isAuxiliaryIdentifier: jest.fn(),
    };
    metadataGenerator = {
      handleSafe: jest.fn(),
    } as any;
    validator = {
      handleSafe: jest.fn(),
    } as any;
    strategy = new ComposedAuxiliaryStrategy(identifierStrategy, metadataGenerator, validator, false, true);
  });

  it('calls the AuxiliaryIdentifierStrategy for related calls.', async(): Promise<void> => {
    strategy.getAuxiliaryIdentifier(identifier);
    expect(identifierStrategy.getAuxiliaryIdentifier).toHaveBeenCalledTimes(1);
    expect(identifierStrategy.getAuxiliaryIdentifier).toHaveBeenLastCalledWith(identifier);

    strategy.getAuxiliaryIdentifiers(identifier);
    expect(identifierStrategy.getAuxiliaryIdentifiers).toHaveBeenCalledTimes(1);
    expect(identifierStrategy.getAuxiliaryIdentifiers).toHaveBeenLastCalledWith(identifier);

    strategy.getAssociatedIdentifier(identifier);
    expect(identifierStrategy.getAssociatedIdentifier).toHaveBeenCalledTimes(1);
    expect(identifierStrategy.getAssociatedIdentifier).toHaveBeenLastCalledWith(identifier);

    strategy.isAuxiliaryIdentifier(identifier);
    expect(identifierStrategy.isAuxiliaryIdentifier).toHaveBeenCalledTimes(1);
    expect(identifierStrategy.isAuxiliaryIdentifier).toHaveBeenLastCalledWith(identifier);
  });

  it('returns the injected value for usesOwnAuthorization.', async(): Promise<void> => {
    expect(strategy.usesOwnAuthorization()).toBe(false);
  });

  it('returns the injected value for isRequiredInRoot.', async(): Promise<void> => {
    expect(strategy.isRequiredInRoot()).toBe(true);
  });

  it('adds metadata through the MetadataGenerator.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata();
    await expect(strategy.addMetadata(metadata)).resolves.toBeUndefined();
    expect(metadataGenerator.handleSafe).toHaveBeenCalledTimes(1);
    expect(metadataGenerator.handleSafe).toHaveBeenLastCalledWith(metadata);
  });

  it('validates data through the Validator.', async(): Promise<void> => {
    const representation = { data: 'data!' } as any;
    await expect(strategy.validate(representation)).resolves.toBeUndefined();
    expect(validator.handleSafe).toHaveBeenCalledTimes(1);
    expect(validator.handleSafe).toHaveBeenLastCalledWith(representation);
  });

  it('defaults isRequiredInRoot to false.', async(): Promise<void> => {
    strategy = new ComposedAuxiliaryStrategy(identifierStrategy, metadataGenerator, validator);
    expect(strategy.isRequiredInRoot()).toBe(false);
  });

  it('does not add metadata or validate if the corresponding classes are not injected.', async(): Promise<void> => {
    strategy = new ComposedAuxiliaryStrategy(identifierStrategy);

    const metadata = new RepresentationMetadata();
    await expect(strategy.addMetadata(metadata)).resolves.toBeUndefined();

    const representation = { data: 'data!' } as any;
    await expect(strategy.validate(representation)).resolves.toBeUndefined();
  });
});
