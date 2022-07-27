# Community Solid Server release notes

## v5.0.0
### New features
- Support for Node v12 was dropped.
- Components.js was upgraded to v5. If you have created an external component
  you should also upgrade to prevent warnings and conflicts.
- A new FileSystemResourceLocker has been added. It allows for true threadsafe locking without external dependencies.
- The CSS can now run multithreaded with multiple workers, this is done with the `--workers` or `-w` flag.
- When starting the server through code, it is now possible to provide CLI value bindings as well in `AppRunner`.
- Metadata of resources can now be edited by PATCHing its description resource. See the [documentation](./documentation/metadata-editing.md) for more information.

### Data migration
The following actions are required if you are upgrading from a v4 server and want to retain your data.

...

### Configuration changes
You might need to make changes to your v4 configuration if you use a custom config.

The `@context` needs to be updated to
`https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^5.0.0/components/context.jsonld`.

The following changes pertain to the imports in the default configs:
- The prefix of all imports was changed from `files-scs` to `css`.
- All default configurations with a file-based backend now use a file-based locker instead of a memory-based one,
  making them threadsafe.

The following changes are relevant for v4 custom configs that replaced certain features.
- `config/app/variables/*` was changed to support the new `YargsCliExtractor` format and `SettingsResolver` rename.
- `config/util/resource-locker/memory.json` had the locker @type changed from `SingleThreadedResourceLocker` to `MemoryResourceLocker`.
- The content-length parser has been moved from the default configuration to the quota configurations.
   - `/ldp/metadata-parser/default.json`
   - `/storage/backend/*-quota-file.json`
   - `/storage/backend/quota/quota-file.json`
- The structure of the init configs has changed significantly to support worker threads.
   - `/app/init/*`
- RegexPathRouting has changed from a map datastructure to an array datastructure, allowing for fallthrough regex parsing. The change is reflected in the following default configs:
   - `/storage/backend/regex.json`
   - `/sparql-file-storage.json`
- The `IdentityProviderFactory` inputs have been extended.
  - `/identity/handler/provider-factory/identity.json`
- LDP components have slightly changed so the preference parser is in a separate config file.
  - `/ldp/handler/*`
- Restructured the init configs.
  - `/app/init/base/init.json`
  - `/app/main/default.json`
- Added lock cleanup on server start (and updated existing finalization).
  - `/util/resource-locker/file.json`
  - `/util/resource-locker/redis.json`
- Updated finalizers.
  - `/app/identity/handler/account-store/default.json` 
  - `/identity/ownership/token.json`
  - `/ldp/authorization/readers/access-checkers/agent-group.json`
  - `/ldp/handler/*`
- `IntermediateModesExtractor` has been added to the `ModesExtractors`
  - `/ldp/modes/default.json`
- The `PermissionReader` structure has changed to be more consistent.
  - `/ldp/authorization/*`
- The `PutOperationHandler` constructor now has an extra argument: `metadataStrategy`, resulting in a change in `/ldp/handler/components/operation-handler.json`
- `.acl` and `.meta` are now generated for every non-auxiliary by `AuxiliaryLinkMetadataWriter` through an update in `/util/auxiliary/strategies/acl.json` and the creation of `/ldp/metadata-writer/writers/link-rel-metadata.json` 
  - As a result the key-value for `acl` resources was removed from `/ldp/metadata-writer/writers/link-rel.json`
- The `DataAccessorBasedStore` constructor now has two new arguments: `metadataStrategy`. As a result following configuration files are changed:
  - `/sparql-file-storage.json`
  - `/storage/backend/*`
- `/storage/middleware/stores/patching.json` has changed significantly to allow description resources to be patched.
- The metadata auxiliary strategy was added to the default list of auxiliary strategies.
  - `/util/auxiliary/*`
- Parsing link headers is updated in `/ldp/metadata-parser/parsers/link.json` as it now uses a `LinkRelObject` as a value

### Interface changes
These changes are relevant if you wrote custom modules for the server that depend on existing interfaces.
- `YargsCliExtractor` was changed to now take as input an array of parameter objects.
- `RedirectAllHttpHandler` was removed and fully replaced by `RedirectingHttpHandler`.
- `SingleThreadedResourceLocker` has been renamed to `MemoryResourceLocker`.
- Both `TemplateEngine` implementations now take a `baseUrl` parameter as input.
- The `IdentityProviderFactory` and `ConvertingErrorHandler` now additionally take a `PreferenceParser` as input.
- Error handlers now take the incoming HttpRequest as input instead of just the preferences.
- Extended the initialization/finalization system:
  * Introduced `Initializable` interface and `InitializableHandler` wrapper class.
  * Introduced `Finalizer` abstract class and `FinalizableHandler` wrapper class.
  * Changed type for `finalizer` attribute in `App` from `Finalizable` to `Finalizer` and updated the calling code in `App.stop()`.
  * Removed the now obsolete `ParallelFinalizer` util class.
- Added a lock cleanup on initialize for lock implementations `RedisLocker` and `FileSystemResourceLocker`.
- `ResourceStore` functions that change a resource now return metadata for every changed resource.
- All permission related interfaces have changed to support permissions over multiple identifiers.
- `IdentifierStrategy` has a new `contains` method.
- `SettingsResolver` was renamed to `ShorthandResolver`, together with all related classes and parameters.
- `DataAccessor` interface is changed. There is now a new method called `writeMetadata`.

A new interface `SingleThreaded` has been added. This empty interface can be implemented to mark a component as not-threadsafe. When the CSS starts in multithreaded mode, it will error and halt if any SingleThreaded components are instantiated.

## v4.0.1
Freezes the `oidc-provider` dependency to prevent a potential issue with the solid authn client
as described in https://github.com/inrupt/solid-client-authn-js/issues/2103.

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
