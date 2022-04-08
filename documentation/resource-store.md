# Resource store
Once an LDP request passes authorization, it will be passed to the `ResourceStore`.

The interface of a `ResourceStore` is mostly a 1-to-1 mapping of the HTTP methods:

 * GET: `getRepresentation`
 * PUT: `setRepresentation`
 * POST: `addResource`
 * DELETE: `deleteResource`
 * PATCH: `modifyResource`

The corresponding `OperationHandler` of the relevant method
is responsible for calling the correct `ResourceStore` function.

In practice, the community server has multiple resource stores chained together,
each handling a specific part of the request and then calling the next store in the chain.
The default configurations come with the following stores:

 1. `MonitoringStore`
 2. `IndexRepresentationStore`
 3. `LockingResourceStore`
 4. `PatchingStore`
 5. `RepresentationConvertingStore`
 6. `DataAccessorBasedStore`

This chain can be seen in the configuration part in `config/storage/middleware/default.json`
and all the entries in `config/storage/backend`.

## MonitoringStore
This store emits the events that are necessary to emit notifications when resources change.

## IndexRepresentationStore
When doing a GET request on a container `/container/`,
this container returns the contents of `/container/index.html` instead if HTML is the preferred response type.
All these values are the defaults and can be configured for other resources and media types.

## LockingResourceStore
To prevent data corruption, the server locks resources when being targeted by a request.
Locks are only released when an operation is completely finished,
in the case of read operations this means the entire data stream is read,
and in the case of write operations this happens when all relevant data is written.
The default lock that is used is a readers-writer lock.
This allows simultaneous read requests on the same resource,
but only while no write request is in progress.

## PatchingStore
PATCH operations in Solid apply certain transformations on the target resource,
which makes them more complicated than only reading or writing data since it involves both.
The `PatchingStore` provides a generic solution for backends that do not implement the `modifyResource` function
so new backends can be added more easily.
In case the next store in the chain does not support PATCH,
the `PatchingStore` will GET the data from the next store,
apply the transformation on that data,
and then PUT it back to the store.

## RepresentationConvertingStore
This store handles everything related to content negotiation.
In case the resulting data of a GET request does not match the preferences of a request,
it will be converted here.
Similarly, if incoming data does not match the type expected by the store,
the SPARQL backend only accepts triples for example,
that is also handled here

## DataAccessorBasedStore
Large parts of the requirements of the Solid protocol specification are resolved by the `DataAccessorBasedStore`:
POST only working on containers, 
DELETE not working on non-empty containers, 
generating `ldp:contains` triples for containers, etc.
Most of this behaviour is independent of how the data is stored which is why it can be generalized here.
The store's name comes from the fact that it makes use of `DataAccessor`s to handle the read/write of resources.
A `DataAccessor` is a simple interface that only focuses on handling the data.
It does not concern itself with any of the necessary Solid checks as it assumes those have already been made.
This means that if a storage method needs to be supported,
only a new `DataAccessor` needs to be made,
after which it can be plugged into the rest of the server.
