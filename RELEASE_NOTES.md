# Community Solid Server release notes

## v4.0.0
### New features
- The server can be started with a new parameter to automatically generate accounts and pods, 
  for more info see [here](documentation/seeding-pods.md).
- It is now possible to automate authentication requests using Client Credentials,
  for more info see [here](documentation/client-credentials.md).
- A new `RedirectingHttpHandler` class has been added which can be used to redirect certain URLs.
- A new default configuration `config/https-file-cli.json` 
  that can set the HTTPS parameters through the CLI has been added.
  This is also an example of how to add CLI parameters through a custom configuration.
- A new RedisLocker has been added to replace the old RedisResourceLocker class. 
  It allows for true threadsafe read/write locking.

### Configuration changes
You might need to make changes to your v3 configuration if you use a custom config.

The `@context` needs to be updated to
`https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^4.0.0/components/context.jsonld`.

The following changes pertain to the imports in the default configs:
- ...

The following changes are relevant for v3 custom configs that replaced certain features.
- The key/value storage configs in `config/storage/key-value/*` have been changed to reduce config duplication.
  All storages there that were only relevant for 1 class have been moved to the config of that class.
- Due to a parameter rename in `CombinedSettingsResolver`, 
  `config/app/variables/resolver/resolver.json` has been updated.
- The OIDC provider setup was changed to add client_credentials support.
  - `/identity/handler/adapter-factory/webid.json`
  - `/identity/handler/provider-factory/identity.json`

### Interface changes
These changes are relevant if you wrote custom modules for the server that depend on existing interfaces.
- The output of `parseContentType` in `HeaderUtil` was changed to include parameters.
- `PermissionReader`s take an additional `modes` parameter as input.
- The `ResourceStore` function `resourceExists` has been renamed to `hasResource`
  and has been moved to a separate `ResourceSet` interface.
- Several `ModesExtractor`s `PermissionBasedAuthorizer` now take a `ResourceSet` as constructor parameter.
- `RepresentationMetadata` no longer accepts strings for predicates in any of its functions.
- `CombinedSettingsResolver` parameter `computers` has been renamed to `resolvers`.
- `IdentityProviderFactory` requires an additional `credentialStorage` parameter.
- The `RedisResourceLocker` class has been removed and the `RedisLocker`class was added instead. 
 `RedisLocker` implements both the `ResourceLocker` and `ReadWriteLocker` interface.

## v3.0.0
### New features
- The Identity Provider now uses the `webid` scope as required for Solid-OIDC.
- The `VoidLocker` can be used to disable locking for development/testing purposes. 
  This can be enabled by changing the `/config/util/resource-locker/` import to `debug-void.json`
- Added support for setting a quota on the server. See the `config/quota-file.json` config for an example.
- An official docker image is now built on each version tag and published at https://hub.docker.com/r/solidproject/community-server.
- Added support for N3 Patch.
- It is now possible to customize arguments to the `community-solid-server` command, 
  which enables passing custom variables to configurations and setting new default values.
- The AppRunner functions have changed to require Components.js variables. 
  This is important for anyone who starts the server from code.
- When logging in, a consent screen will now provide information about the client.

### Data migration
The following actions are required if you are upgrading from a v2 server and want to retain your data.

Due to changes in the keys used by the IDP, you will need to delete the stored keys and sessions.
If you are using a file backend, delete the `.internal/idp/` folder in your data folder and restart the server.
This will not delete the user accounts, but users will have to log in again.

### Configuration changes
You might need to make changes to your v2 configuration if you use a custom config.

The `@context` needs to be updated to 
`https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^3.0.0/components/context.jsonld`.

The following changes pertain to the imports in the default configs:
- A new configuration option needs to be imported:
  - `/app/variables/default.json` contains everything related to parsing CLI arguments 
    and assigning values to variables.

The following changes are relevant for v2 custom configs that replaced certain features.
- Conversion has been simplified so most converters are part of the conversion chain:
  - `/util/representation-conversion/default.json`
- The IDP settings have changed to support the latest Solid-OIDC draft.
  - `/identity/handler/provider-factory/identity.json`
- Requests targeting the OIDC library now use a separate handler.
  - `/http/handler/default.json`
  - `/identity/handler/default.json`
- The architecture of IDP interaction handlers has completely changed to improve modularity
  - `/identity/handler/interaction/*`
  - `/identity/registration/*`

### Interface changes
These changes are relevant if you wrote custom modules for the server that depend on existing interfaces.
- `TypedRepresentationConverter` function signatures changed 
  and base functionality moved to `BaseTypedRepresentationConverter`.
- Many changes to several components related to the IDP. This includes the HTML templates.

## v2.0.0
### New features
- Pod owners always have Control access to resources stored in their Pod.
- The server now offers a one-time setup upon first boot.
  This can be accessed by going to `/setup`.
  Configurations with a persistent backend enforce setup before the server can be used,
  preventing unintended modifications in the backend.
  These have corresponding `*-no-setup.json` files where setup is disabled,
  so the pre-v2.0 behavior is still available.
- `ETag`, `Last-Modified`, `If-None-Match`, and related conditional headers are supported.
- `PATCH`ing containers is now supported.
- `PUT`/`POST` requests with empty bodies are supported.
- WebACL authorization supports groups.
- IDP components (registration, login, etc.) fully support JSON input and output.
- There is a new configuration `sparql-file-storage.json` to have a SPARQL backend with file storage.
  `sparql-file-storage.json`.
- A server can be set up to restrict access to IDP components using WebACL.
  A consequence of this is that IDP components are only accessible using a trailing slash.
  E.g., `/idp/register/` works, `/idp/register` will error.

### Configuration changes
You might need to make changes to your v1 configuration if you use a custom config.

The following changes pertain to the imports in the default configs:
- There are 2 new configuration options that for which a valid option needs to be imported:
  - `/app/setup` determines how and if setup should be enabled.
  - `/identity/access` determines if IDP access (e.g., registration) should be restricted
- The `/app/init/default.json` configuration no longer initializes the root container. 
  This behaviour has been moved to the other options for `/app/init`.
- `/ldp/permissions` changed to `/ldp/modes` and only has a default option now.

The following changes are relevant for v1 custom configs that replaced certain features.
The path indicates which JSON-LD files were impacted by the change.
- `IdentityProviderHttpHandler` and `InteractionRoute` arguments have changed substantially. 
  - `/identity/handler/default.json`
  - `/identity/handler/interaction/*`
  - `/identity/registration/*`.
- All internal storage is now stored in the `/.internal/` container. 
  - `/storage/key-value/resource-store.json`. 
- Patching related classes have changed. 
  - `/storage/middleware/stores/patching.json`.
- `BasicRequestParser` now needs a `conditionsParser` argument.
  - `/ldp/handler/components/request-parser.json`.
- `LinkTypeParser` has been renamed to `LinkRelParser` and now takes mappings as input. 
  - `/ldp/metadata-parser/*`
- `ComposedAuxiliaryStrategy` `isRootRequired` has been renamed to `requiredInRoot`. 
  - `/util/auxiliary/strategies/acl.json`.
- Many changes to authentication and authorization structure. 
  - Config `/ldp/authentication/*` and `/ldp/authorization/*`.
- All `HttpHandler`s have been changed. 
  - `/app/setup/handlers/setup.json`
  - `/http/handler/default.json`
  - `/identity/handler/default.json`
  - `/ldp/handler/default.json`.

## v1.1.0
### New features
- The `ConstantConverter` can now filter on media type using the `enabledMediaRanges` and `disabledMediaRanges` options. That way, the server can be configured to bypass a default UI when accessing images or PDF documents. (https://github.com/solid/community-server/discussions/895, https://github.com/solid/community-server/pull/925)

## v1.0.0
First release of the Community Solid Server.
