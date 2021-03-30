import type { Representation } from '../../ldp/representation/Representation';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { PodSettings } from './PodSettings';

/**
 * Parser that generates a {@link PodSettings} from the data in the given {@link Representation}.
 */
export abstract class PodSettingsParser extends AsyncHandler<Representation, PodSettings> { }
