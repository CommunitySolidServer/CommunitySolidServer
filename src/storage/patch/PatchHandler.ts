import type { Patch } from '../../ldp/http/Patch';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/AsyncHandler';

export abstract class PatchHandler extends AsyncHandler<{identifier: ResourceIdentifier; patch: Patch}> {}
