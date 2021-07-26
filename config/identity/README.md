# Identity
Options related to the Identity Provider.

## Email
Necessary for sending e-mail when using IDP.
* *default*: Disables e-mail functionality.
* *example*: An example of what your e-mail configuration should look like.
  In that case you should not import anything from this folder
  but have the settings in your root config.

## Handler
Contains everything needed for setting up the Identity Provider.
* *default*: As of writing there is not much customization possible.
  This contains everything needed.
  
## Ownership
Which technique to use to determine if a requesting agent owns a WebID.
* *token*: A token needs to added to the WebID to prove ownership.
* *unsafe-no-check*: No verification is done, the agent is always believed.

## Pod
What to use for pod creation.
* *dynamic*: Every created pod has its own Components.js config for its ResourceStore,
  which can differ from the others.
* *static*: All pod data is stored in separate containers in the same ResourceStore.

## Registration
If users should be able to register on the server.
* *enabled*: Enables registration.
* *disabled*: Disables registration.
