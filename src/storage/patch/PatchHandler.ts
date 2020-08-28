import { Patch } from '../../ldp/http/Patch';
import { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/AsyncHandler';

export abstract class PatchHandler extends AsyncHandler<{identifier: ResourceIdentifier; patch: Patch}> {}
