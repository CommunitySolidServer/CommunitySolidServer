import type { PassThrough } from 'stream';
import type { SingleThreaded } from '../../../init/cluster/SingleThreaded';
import { WrappedSetMultiMap } from '../../../util/map/WrappedSetMultiMap';

/**
 * A {@link SetMultiMap} linking identifiers to a set of StreamingHTTP streams.
 * An extension of {@link WrappedSetMultiMap} to make sure Components.js allows us to create this in the config,
 * as {@link WrappedSetMultiMap} has a constructor not supported.
 */
export class StreamingHTTPMap extends WrappedSetMultiMap<string, PassThrough> implements SingleThreaded {}
