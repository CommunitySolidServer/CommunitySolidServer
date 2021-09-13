import { statSync } from 'fs';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Size } from './size.model';
import type { SizeReporter } from './SizeReporter';

/**
 * SizeReporter that is used to calculate sizes of resources for a file based system
 */
export class FileSizeReporter implements SizeReporter {
  // The FileSizeReporter will always return byte values
  public unit = 'bytes';

  /**
   * Returns the size of the given resource in bytes
   */
  public getSize(identifier: ResourceIdentifier): Size {
    return { unit: this.unit, amount: statSync(identifier.path).size };
  }
}
