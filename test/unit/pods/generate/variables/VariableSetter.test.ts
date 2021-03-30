import { VariableSetter } from '../../../../../src/pods/generate/variables/VariableSetter';
import type { PodSettings } from '../../../../../src/pods/settings/PodSettings';

describe('A VariableSetter', (): void => {
  const variable = 'variable';
  const value = 'http://test.com/sparql';
  let settings: PodSettings;
  let handler: VariableSetter;

  beforeEach(async(): Promise<void> => {
    settings = {} as any;
  });

  it('does nothing if there already is a sparql endpoint value and override is false.', async(): Promise<void> => {
    handler = new VariableSetter(variable, value);
    settings[variable] = 'sparql-endpoint';
    await expect(handler.handle({ settings })).resolves.toBeUndefined();
    expect(settings[variable]).toBe('sparql-endpoint');
  });

  it('adds adds the value to the variable if there is none.', async(): Promise<void> => {
    handler = new VariableSetter(variable, value);
    await expect(handler.handle({ settings })).resolves.toBeUndefined();
    expect(settings[variable]).toBe(value);
  });

  it('always sets the value if override is true.', async(): Promise<void> => {
    handler = new VariableSetter(variable, value, true);
    settings[variable] = 'sparql-endpoint';
    await expect(handler.handle({ settings })).resolves.toBeUndefined();
    expect(settings[variable]).toBe(value);
  });
});
