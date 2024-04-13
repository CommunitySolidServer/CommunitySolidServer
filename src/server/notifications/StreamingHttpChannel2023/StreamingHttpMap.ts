import type { PassThrough } from 'node:stream';
import type { SingleThreaded } from '../../../init/cluster/SingleThreaded';
import { WrappedSetMultiMap } from '../../../util/map/WrappedSetMultiMap';

/**
 * A {@link SetMultiMap} linking identifiers to a set of Streaming HTTP streams.
 * An extension of {@link WrappedSetMultiMap} to make sure Components.js allows us to create this in the config,
 * as {@link WrappedSetMultiMap} has a constructor not supported.
 */
export class StreamingHttpMap extends WrappedSetMultiMap<string, PassThrough> implements SingleThreaded {}
