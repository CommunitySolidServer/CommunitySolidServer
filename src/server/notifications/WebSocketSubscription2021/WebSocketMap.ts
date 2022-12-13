import type { WebSocket } from 'ws';
import type { SingleThreaded } from '../../../init/cluster/SingleThreaded';
import { WrappedSetMultiMap } from '../../../util/map/WrappedSetMultiMap';

/**
 * A {@link SetMultiMap} linking identifiers to a set of WebSockets.
 * An extension of {@link WrappedSetMultiMap} to make sure Components.js allows us to create this in the config,
 * as {@link WrappedSetMultiMap} has a constructor not supported.
 */
export class WebSocketMap extends WrappedSetMultiMap<string, WebSocket> implements SingleThreaded {}
