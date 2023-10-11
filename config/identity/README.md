# Identity

Options related to the Identity Provider.

## Access

Determines how publicly accessible some IDP features are.

* *public*: Everything is publicly accessible.
* *restricted*: The IDP components use the same authorization scheme as the main LDP component.
  For example, if the server uses WebACL authorization and the registration endpoint is `/idp/register/`,
  access to registration can be restricted by creating a valid `/idp/register/.acl` resource.
  WARNING: This setting will write the necessary resources to the `.well-known` and IDP containers
  to make this work. Again in the case of WebACL, this means ACL resources allowing full control access.
  So make sure to update those two containers so only the correct credentials have the correct rights.

## Email

Necessary for sending e-mail when using IDP.

* *default*: Disables e-mail functionality.
* *example*: An example of what your e-mail configuration should look like.
  In that case you should not import anything from this folder
  but have the settings in your root config.

## Handler

Contains everything needed for setting up the account management.

* *default*: All account features enabled.
* *disabled*: Completely disables everything account related.
* *no-accounts*: Disables the creation of new accounts.
* *no-accounts-pods*: Disables the creation of new accounts and creating new pods for existing accounts.
* *no-pods*: Disables the creation of new pods.

## OIDC

Determines if OIDC interactions are supported as an identity provider.

* *default*: OIDC is enabled.
* *disabled*: OIDC is disabled.

## Interaction

Everything related to the JSON API and its routing.

* *default*: Everything enabled.
* *no-accounts*: Disables the creation of new accounts.
* *no-pods*: Disables the creation of new pods.

## Ownership

Which technique to use to determine if a requesting agent owns a WebID.

* *token*: A token needs to added to the WebID to prove ownership.
* *unsafe-no-check*: No verification is done, the agent is always believed.

## Pod

What to use for pod creation.

* *dynamic*: Every created pod has its own Components.js config for its ResourceStore,
  which can differ from the others.
* *static*: All pod data is stored in separate containers in the same ResourceStore.
