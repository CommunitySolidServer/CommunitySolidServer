# Storage
Options related to how data and resources are stored.

## Key-Value
Used by certain classes for internal storage.
* *memory*: Store everything in memory.
* *resource-store*: Store everything in a specific container in the resource store.

## Resource-Store
The chain of ResourceStores that needs to be passed through before reaching the actual data.
There is much variety possible here so chances are higher that a custom solution is needed here.
Most configs here have the same default setup (Monitoring -> Locking -> Patching -> Converting)
and only differ at the tail.
* *dynamic*: The routing store used at the tail here is needed when using dynamic pod creation.
* *file*: Default setup with a file backend.
* *memory*: Default setup with a memory backend.
* *regex*: Uses a different backend based on the container that is being used.
* *sparql*: Default setup with a SPARQL endpoint backend.
  Also updates the converting store so all incoming data is transformed into quads.
