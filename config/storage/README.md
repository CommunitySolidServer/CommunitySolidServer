# Storage
Options related to how data and resources are stored.

## Backend
The final part of the ResourceStore chain that handles data access.
* *dynamic*: The routing store used here is needed when using dynamic pod creation.
* *file*: Default setup with a file backend.
* *memory*: Default setup with a memory backend.
* *regex*: Uses a different backend based on the container that is being used.
* *sparql*: Default setup with a SPARQL endpoint backend.
  Also updates the converting store so all incoming data is transformed into quads.

## Key-Value
Used by certain classes for internal storage.
* *memory*: Store everything in memory.
* *resource-store*: Store everything in a specific container in the resource store.

## Middleware
The chain of utility ResourceStores that needs to be passed through before reaching the backend stores.
The final store in this chain takes the store from the stores/backend config as source.
* *default*: Chains all the utility stores: 
  Monitoring -> IndexRepresentation -> Locking -> Patching -> Converting
