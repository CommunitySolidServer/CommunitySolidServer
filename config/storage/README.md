# Storage

Options related to how data and resources are stored.

## Backend

The final part of the ResourceStore chain that handles data access.

* *dynamic*: The routing store used here is needed when using dynamic pod creation.
* *file*: Default setup with a file backend.
* *global-quota-file*: File backend with a global quota over the entire server.
* *memory*: Default setup with a memory backend.
* *pod-quota-file*: File backend with a max quota per pod.
* *regex*: Uses a different backend based on the container that is being used.
* *sparql*: Default setup with a SPARQL endpoint backend.
  Also updates the converting store so all incoming data is transformed into quads.

## Key-Value

Used by certain classes for internal storage.

* *memory*: Store everything in memory.
* *resource-store*: Store everything in a specific container in the resource store.

## Location

Tells the server where it can find the storage root(s).
Solid does not allow storage roots to be nested,
so usually you either have one storage root at the server with no pods,
or multiple storage roots at pod level with an inaccessible server root.

* *pod*: Indicates that the root storages are at pod level.
         If subdomains are used for pods, this will also include the actual server root.
* *root*: There is only one storage root, and it is the same as the server root.

## Middleware

The chain of utility ResourceStores that needs to be passed through before reaching the backend stores.
The final store in this chain takes the store from the stores/backend config as source.

* *default*: Chains all the utility stores:
  Monitoring -> IndexRepresentation -> Locking -> Patching -> Converting
