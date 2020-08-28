import { FileResourceStore } from '../../storage/FileResourceStore';
import { ResourceStore } from '../../storage/ResourceStore';
import { RouterRule } from './RouterRule';

export class DefaultRouterRule implements RouterRule {
  private readonly fileResourceStore: FileResourceStore;

  /**
   * @param fileResourceStore - Instance of FileResourceStore to use.
   */
  public constructor(fileResourceStore: FileResourceStore) {
    this.fileResourceStore = fileResourceStore;
  }

  /**
   * Returns the FileResourceStore in all cases.
   */
  public getMatchingResourceStore(): ResourceStore | undefined {
    return this.fileResourceStore;
  }
}
