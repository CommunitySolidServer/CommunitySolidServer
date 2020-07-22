import { AsyncHandler } from '../../util/AsyncHandler';
import { Patch } from '../../ldp/http/Patch';
import { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';

export abstract class PatchHandler extends AsyncHandler<{identifier: ResourceIdentifier; patch: Patch}> {}
