# Pod
Options related to pod provisioning.

## Handler
What to use for pod creation. This covers several features
and is a bit more extensive than many other options.
* *dynamic*: Every created pod has its own components.js config for its ResourceStore,
  which can differ from the others.
* *static*: All pod data is stored in separate containers in the same ResourceStore.
