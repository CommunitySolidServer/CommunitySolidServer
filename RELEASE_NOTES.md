# Community Solid Server release notes

## v7.0.0

### New features

- The minimum supported Node version is now v18.
- Account management and everything related to it have been drastically changed,
  see the [usage documentation](https://communitysolidserver.github.io/CommunitySolidServer/7.x/usage/identity-provider/)
  for an overview of the new features,
  and the [architecture documentation](http://communitysolidserver.github.io/CommunitySolidServer/7.x/architecture/features/accounts/overview/)
  for an overview of the new structure.
  On a default server, the entry point for everything related to accounts is <http://localhost:3000/.account/>.
  Creating an account now requires multiple steps, but allows you to have multiple pods or WebIDs for 1 account.
  The architecture has been updated to be more easily extensible.
- Pod seeding has been updated to account for the new account management, with an updated CLI parameter `--seedConfig`,
  see the [updated documentation](https://communitysolidserver.github.io/CommunitySolidServer/7.x/usage/seeding-pods/)
  for more details.
- Migration was added to update account data automatically from previous versions. See below for more details.
- Due to the changes in account management, setup has been removed completely.
  The `*-no-setup.json` configurations have been renamed to `*-root.json` to indicate their focus on the root container.
- The `StaticAssetHandler` can now be used to link static pages to containers.
  This can be used to set a static page for the root container of a server.
  See the `/config/app/init/static-root.json` config for an example.

### Data migration

Old internal data will need to be migrated.
When starting the server for the first time after updating the version,
this will happen automatically.
A prompt will be shown to confirm.
It is advised to first backup the internal data in case something goes wrong.
When using the filesystem backend with default storage options,
these can be found in the `.internal` folder.

Only account data will be migrated,
other internal data such as OIDC sessions and notification subscriptions will be removed
as how they are stored has changed as well.
This means existing tokens and sessions will be invalidated and users will have to log in again.
Notifications will have to be resubscribed to for the same reason.

This migration step is based on how storage is defined in the configurations provided in this repository.
If you made drastic changes to how internal data is stored,
you might need to have a look at the `app/init/migration/v6.json` configuration.

In case the prompt causes issues, it can be skipped automatically with the `--confirmMigration` CLI option.

### Configuration changes

You might need to make changes to your v6 configuration if you use a custom config.

The `@context` needs to be updated to
`https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^7.0.0/components/context.jsonld`.

The following changes pertain to the imports in the default configs:

- There is a new `identity/oidc` import set that needs to be added to each config.
  Options are `default.json` and `disabled.json`.
- There is a new `static-root.json` import option for `app/init`, setting a static page for the root container.
- There is a new `initialize-root-pod.json` import option for `app/init`, initializing a pod in the root.
- There are more `identity/handler` options to finetune account management availability.
- There is a new set of imports `storage/location` to determine where the root storage of the server is located.
- The `app/setup`and `identity/registration` imports have been removed.
- There is a new `ldp/handler/disabled.json` import to disable the LDP API.

The following changes are relevant for v6 custom configs that replaced certain features.

- All configurations that had a reference to setup have been updated.
- `/app/init/*` imports have changed. Functionality remained the same though.
- All imports that define storages have been updated with new storage classes.
    - `/http/notifications/base/storage.json`
    - `/storage/keyvalue/storages/storages.json`
- All identifiers containing the string "WebHook" have been renamed to instead use "Webhook"
  to be consistent with the notification type.
- `/identity/*` configurations have drastically changed due to the account management update.
- `/http/static/default.json` has been updated to allow easier overriding of the static resources.

### Interface changes

These changes are relevant if you wrote custom modules for the server that depend on existing interfaces.

- The `AppRunner` functions to create and start the server now take a singular arguments object as input.
- Most of the key/value related storages had their constructors changed to allow more values.
- `EncodingPathStorage` has been removed
  and its functionality split up over `Base64EncodingStorage` and `ContainerPathStorage`.
  `HashEncodingPathStorage` has similarly been replaced by introducing `HashEncodingStorage`.
- All classes with the name `WebHook*` have been renamed to `Webhook*`
  to be consistent with the corresponding notification type.
- Most classes related to the IDP have been changed.
- All classes related to setup have been removed.
- The `StaticAssetHandler` has bene updated to support the new functionality.
- `SeededPodInitializer` has been renamed to `SeededAccountInitializer`.
- `WebIdAdapterFactory` has been renamed to `ClientIdAdapterFactory`.

## v6.1.0

### New features

- Added support for HTTP Range headers.

## v6.0.0

### New features

- The server can be configured to use [ACP](https://solidproject.org/TR/acp) instead of WebACL.
  `config/file-acp.json` is an example of a configuration that uses this authorization scheme instead.
- Support for the new [Notification specification](https://solidproject.org/TR/2022/notifications-protocol-20221231)
  was added. See the documentation for further details.
- All resources now have a storage description header as defined in the v0.10.0 Solid protocol specification.
- The server configuration settings can be set from the package.json or .community-solid-server.config.json/.js files.

### Data migration

No actions are required to migrate data.

### Template changes

The expected format of template folders for generating pods or initializing the root has changed,
see the `templates/pod` folder for an example.
More specifically: each of those folders used is now expected to have multiple subfolders.
The subfolder `base` will always be copied,
whereas the subfolders `acp` and `wac` will only be copied if the corresponding access control system is enabled.

### Configuration changes

You might need to make changes to your v5 configuration if you use a custom config.

The `@context` needs to be updated to
`https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^6.0.0/components/context.jsonld`.

The following changes pertain to the imports in the default configs:

- All default configurations which had setup disabled have been updated to also disable registration.
  This is done to prevent configurations with accidental nested storage containers.
- All references to WebSockets have been removed from the `http/middleware` and `http/server-factory` imports.
- A new `http/notifications` set of import options have been added
  to determine which notification specification a CSS instance should use.
  Most default configurations have been updated to use `http/notifications/websockets.json`.
- `ldp/authorization` and `util/auxiliary` have new options to support ACP.
- `util/auxiliary/no-acl.json` was renamed to `util/auxiliary/empty.json`.

The following changes are relevant for v5 custom configs that replaced certain features.

- Updated template configs.
    - `/app/main/general/templates.json` was added to configure a generic template engine handler.
    - `/app/main/default.json` now imports the above config file.
    - All files configuring template engines.
- Several minor changes due to support ACP.
    - `/ldp/authorization/*`
- Resource generation was changed to there is 1 reusable resource generator.
    - `/init/initializers/*`
    - `/setup/handlers/setup.json`
    - `/identity/access/initializers/*`
    - `/identity/pod/*`
- Creating an HTTP(S) server is now separate from attaching a handler to it.
    - `/http/server-factory/*`
- The WebSocket middleware was moved to the relevant WebSocket configuration.
    - `/http/middleware/*`
- Storage description support was added.
    - `/http/handler/*`
    - `/ldp/metadata-writer/*`
- Notification support was added.
    - `/http/handler/*`
    - `/notifications/*`
- IDP private key generation was moved to a separate generator class.
    - `/identity/handler/*`
- The Read/Write lockers have changed slightly.
    - `/util/resource-locker/file.json`
    - `/util/resource-locker/memory.json`

### Interface changes

These changes are relevant if you wrote custom modules for the server that depend on existing interfaces.

- `AgentGroupAccessChecker` no longer accepts any input parameters.
- The functions in `Vocabularies.ts` were renamed,
  the typings have been made more precise and several utility types were added.
- The `RepresentationConvetingStore` `options.inType` was replaced with `options.inPreferences`.
- Several changes to support ACP.
    - `WebAclAuxiliaryReader` was renamed to `AuthAuxiliaryReader`.
    - `OwnerPermissionReader` input parameter `aclStrategy` was renamed to `authStrategy`.
    - `TemplatedResourcesGenerator` has been renamed to `BaseResourcesGenerator` and has a different interface now.
- `CredentialSet` was replaced by a single `Credentials` interface.
  `PermissionSet` and `Permission` were merged into a single interface.
  This impacts all authentication and authorization related classes.
- `HttpServerFactory.startServer` function was renamed to `createServer` and is no longer expected to start the server.
- `GreedyReadWriteLocker` constructor parameters have changed.

## v5.1.0

### New features

- The `--config` CLI parameter now accepts multiple configuration paths, which will be combined.
- The `RedisLocker` now accepts more configuration parameters.
- `IdentityProviderFactory` takes an addition `JwkGenerator` as input.

## v5.0.0

### New features

- Metadata of resources can now be edited by PATCHing its description resource.
  This has an impact on which requests are allowed.
  See the [documentation](https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/metadata/) for more information.
- Components.js was upgraded to v5. If you have created an external component
  you should also upgrade to prevent warnings and conflicts.
- The server can now run multithreaded with multiple workers. This is done with the `--workers` or `-w` flag.
- File-based configurations now use a file-based locking system for true threadsafe locking.
- The user can choose to "Log in with a different account" on the consent page.
- Regex-based configurations now have ordered entries and use the first match found.
- When starting the server through code, it is now possible to provide CLI value bindings as well in `AppRunner`.
- Support for Node v12 was dropped.

### Data migration

No actions are required to migrate data.

### Configuration changes

You might need to make changes to your v4 configuration if you use a custom config.

The `@context` needs to be updated to
`https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^5.0.0/components/context.jsonld`.

The following changes pertain to the imports in the default configs:

- The prefix of all imports was changed from `files-scs` to `css`.
- All default configurations with a file-based backend now use a file-based locker instead of a memory-based one,
  making them threadsafe.
- 2 new options have been added for the `/http/server-factory/` imports: `https-websockets.json` and `https-no-websockets.json`,
  which allow starting the server with HTTPS by adding 2 new CLI parameters `httpsKey` and `httpsCert`.
    - `/https-file-cli.json` was greatly simplified because of this change.
- `/sparql-file-storage.json` had several changes, simplifying how regexes can be used.

The following changes are relevant for v4 custom configs that replaced certain features.

- CLI parsing had several changes.
    - `/app/variables/*`
- The `SingleThreadedResourceLocker` was renamed.
    - `/util/resource-locker/memory.json`
- The content-length parser has been moved from the default configuration to the quota configurations.
    - `/ldp/metadata-parser/default.json`
    - `/storage/backend/*-quota-file.json`
    - `/storage/backend/quota/*`
- Regex routing was updated to use ordered entries.
    - `/storage/backend/regex.json`
- The `IdentityProviderFactory` inputs have been extended.
    - `/identity/handler/provider-factory/identity.json`
- Restructured the init configs.
    - `/app/init/*`
    - `/app/main/default.json`
- Added lock cleanup on server start.
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
- Several components now take a `metadataStrategy` parameter to support the new metadata feature.
    - `/ldp/handler/components/operation-handler.json`
    - `/storage/backend/*`
- Generation of auxiliary link headers was updated.
    - `/ldp/metadata-writer/writers/link-rel.json`
- The `ConstantMetadataWriter` that adds the `MS-Author-Via` header was removed
    - `/ldp/metadata-writer/default.json`
- PATCHing related components were completely refactored.
    - `/storage/middleware/stores/patching.json`
- The metadata auxiliary strategy was added to the default list of auxiliary strategies.
    - `/util/auxiliary/*`
- Parsing link headers became more flexible.
    - `/ldp/metadata-parser/parsers/link.json`

### Interface changes

A new interface `SingleThreaded` has been added. This empty interface can be implemented to mark a component as not-threadsafe.
When the CSS starts in multithreaded mode, it will error and halt if any SingleThreaded components are instantiated.

These changes are relevant if you wrote custom modules for the server that depend on existing interfaces.

- `YargsCliExtractor` was changed to now take as input an array of parameter objects.
- `RedirectAllHttpHandler` was removed and fully replaced by `RedirectingHttpHandler`.
- `SingleThreadedResourceLocker` has been renamed to `MemoryResourceLocker`.
- Both `TemplateEngine` implementations now take a `baseUrl` parameter as input.
- The `IdentityProviderFactory` and `ConvertingErrorHandler` now additionally take a `PreferenceParser` as input.
- Error handlers now take the incoming `HttpRequest` as input instead of just the preferences.
- Extended the initialization/finalization system:
    - Introduced `Initializable` interface and `InitializableHandler` wrapper class.
    - Introduced `Finalizer` abstract class and `FinalizableHandler` wrapper class.
    - Changed type for `finalizer` attribute in `App` from `Finalizable` to `Finalizer` and updated the calling code in `App.stop()`.
    - Removed the now obsolete `ParallelFinalizer` util class.
- Added a lock cleanup on initialize for lock implementations `RedisLocker` and `FileSystemResourceLocker`.
- `ResourceStore` functions that change a resource now return metadata for every changed resource.
- All permission related interfaces have changed to support permissions over multiple identifiers.
- `IdentifierStrategy` has a new `contains` method.
- `SettingsResolver` was renamed to `ShorthandResolver`, together with all related classes and parameters.
- The `DataAccessor` interface is changed. There is now a new method called `writeMetadata`.
- Many patching related classes were changed.

## v4.1.0

### New features

- Environment variables can be used instead of CLI arguments if preferred.

## v4.0.1

Freezes the `oidc-provider` dependency to prevent a potential issue with the solid authn client
as described in <https://github.com/inrupt/solid-client-authn-js/issues/2103>.

## v4.0.0

### New features

- The server can be started with a new parameter to automatically generate accounts and pods,
  for more info see [here](https://communitysolidserver.github.io/CommunitySolidServer/4.x/seeding-pods/).
- It is now possible to automate authentication requests using Client Credentials,
  for more info see [here](https://communitysolidserver.github.io/CommunitySolidServer/4.x/client-credentials/).
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
- An official docker image is now built on each version tag and published at <https://hub.docker.com/r/solidproject/community-server>.
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

- The `ConstantConverter` can now filter on media type using the `enabledMediaRanges` and `disabledMediaRanges` options.
  That way, the server can be configured to bypass a default UI when accessing images or PDF documents
  (<https://github.com/solid/community-server/discussions/895>, <https://github.com/solid/community-server/pull/925>).

## v1.0.0

First release of the Community Solid Server.
