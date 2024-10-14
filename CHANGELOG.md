<!-- markdownlint-disable MD013 -->
# Changelog

All notable changes to this project will be documented in this file.

## [7.1.3](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v7.1.2...v7.1.3) (2024-10-14)

### Fixes

* Streaming video by adding a limit to streaming chunks ([b8bcec9](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/b8bcec90ccdea30b21b4095c38c6494a39a599cc))

### Chores

* Update @bergos/jsonparse to v1.4.2 ([7c31053](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7c310535f0f5fca1c1d2098b7a7b95bc8c2ac783))

## [7.1.2](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v7.1.1...v7.1.2) (2024-08-20)

### Fixes

* Use full encoded topic iri in streaming http receiveFrom url template ([3e8365b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3e8365bb2613737fb28c376b5967a351a1300432))

## [7.1.1](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v7.1.0...v7.1.1) (2024-08-07)

### Fixes

* Ensure streaming HTTP streams the whole notification in a single chunk ([3dd8602](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3dd8602acce892b36d1ecaf584c938032e754213))

### Chores

* Increase jest timeout ([e15c59c](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e15c59c157882181340fa87a7116b5b34252a79b))
* Use correct markdownlint-cli2 fix command ([b93aa31](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/b93aa31c932935c21f1e3666fdab3d0947a645eb))
* Depend on external eslint package ([46f5fc2](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/46f5fc239efa794f5309834fa818d17c96f83bd1))

### Documentation

* Update server architecture documentation ([9c44f37](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9c44f375f2537fa0277a6c6831c63c1c1cfc5373))
* Explain oidc.json ([73619fd](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/73619fda056d5a9b0b0fac271f29fbced0424169))
* Explain WAC vs ACP ([ab41967](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/ab419674df5a92054128588747c3abc06086c3ab))
* Explain the provided configs ([ed6f2ec](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/ed6f2ec8e953e84efa6701482d00f616cf6ecbc2))
* Add test instructions to documentation ([3aa28fa](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3aa28fa03b4d1324998e7f6a5ebe5788d0e6b2c9))
* Add more explicit installation instructions ([e45bce8](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e45bce89aabc95b34ecbefcf46f899a88e60cfef))
* Add missing index for starting the server ([d350c14](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d350c140fd184d33cbaf6880b9d4b1476d1ffb7c))
* Add HTTP streaming notification option to docs ([556899d](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/556899dbdbf3bb285de71225d156c4891dce23a9))

## [7.1.0](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v7.0.5...v7.1.0) (2024-05-24)

### Features

* Add support for StreamingHTTPChannel2023 notifications ([cb38613](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/cb38613b4cea7f4e808b30a69f1d9aecbb9506e2))
* Store original target in error metadata ([419312e](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/419312ee5f4790881a5d101afea7ab6ca88f5e61))

### Fixes

* Fix .nvmrc version ([0749963](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/07499631b44154fd24d3fd8fd704df34dfca0d0a))
* Combine metadata with data when generating resources ([e20efac](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e20efac3eaa79b2ed8b09cd72a7f8f0d85655894))
* Make `getParentContainer` work with query parameters ([0998970](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/099897013c4ea014212495965d4972e5078ed406))
* Do not reuse the same error in StaticThrowHandler ([f73dfb3](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f73dfb31c0fe132524323acf6c4f4636bcd8bc80))
* Make allow headers more accurate ([5e60000](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/5e600006819ae1cf1f8edf804218aee700c59bae))
* Expose auxiliary links on errors ([d7078ad](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d7078ad69261566c44e38d1bb19142fb8bd4dd0f))

### Refactors

* Simplify eslint configs ([cac70b1](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/cac70b1f88dcbbb3ebbe0b8e0b082ead4ab27b33))

## [7.0.5](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v7.0.4...v7.0.5) (2024-03-25)

### Fixes

* Allow path segments to start with 2 or more dots ([6fe6b6e](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/6fe6b6ec89cfa3c1005ca4cf2219fc77de3fb975))
* Add priorities to RDF types when converting ([33e9ae4](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/33e9ae41916c9de0638709b02c42936e53d49414))
* Extract root as possible pod when using subdomains ([8fff08a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/8fff08a9b60a11c7a7f313c540d9f28a2f96ebc0))
* Prevent error when switching accounts ([68975e6](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/68975e6627416c248d82150692199db8a5fd0d31))
* Keep content-type when using metadata templates ([137027e](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/137027e421da9ffa2d2bbc23c08b2a47d4abd328))

## [7.0.4](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v7.0.3...v7.0.4) (2024-02-07)

### Chores

* Replace rdf-js import with @rdfjs/types ([e09b53b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e09b53b20de0e389715d299466a1e1101579dd07))

### Testing

* Remove workaround for authn library ([7d57359](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7d573596139283637cf2d1e99d44cb2130268811))

## [7.0.3](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v7.0.2...v7.0.3) (2024-01-05)

### Features

* Support default mainModulePath when creating App ([c6ec45c](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/c6ec45c7c0fb91a1c1365e9a0139e4fdaf8838d6))

### Fixes

* Encode WebID ownership tokens ([277a0d0](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/277a0d0ab724074ed96940836ecc973a8533c538))
* Fix pod base URL in README template ([4e7929f](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/4e7929f6d2b72fbb0a03e8f6e64955239f41c837))
* Only require append when creating with PUT ([a0b7ee4](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/a0b7ee42f3a39cdd8fe2dbf1470e53f57ea62aba))

### Chores

* Remove Docker arm builds ([648ce1f](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/648ce1fba8737dc7a008ff987de161e5902f9d09))
* Update linting dependency ([3a9b0d6](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3a9b0d69f01d6f0490983eda4ff8000798e10dcc))

### Documentation

* Explain how to use AppRunner to start a server instance ([716c3c3](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/716c3c308933a10382d6726a70b5b77a62cfb787))
* Explain that users need to log in for client credentials ([dca71bc](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/dca71bc5b82a9790d861babdcb1dd231c99dd042))
* Fix links ([1f88864](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/1f888645d6619e253082f4bf0ed20e7ae4e4c38b))
* Describe server feature set ([c64a1a2](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/c64a1a241ddd975f22eb223d545c938dfc8cb63c))
* Fix Typo `is -> if` ([355f7dd](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/355f7dd1c7b9be14c3e243acb5c4634f3a800442))

### Testing

* Run tests on Node 21 ([8f74fc8](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/8f74fc82ad8a611bf96c293748bc5c01c859cdeb))

## [7.0.2](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v7.0.1...v7.0.2) (2023-11-20)

### Features

* Add index signature to Credentials ([86f4592](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/86f45923ba6cc696615a98a5fbc8f13a525e4745))
* Pass requestedModes metadata on 401 ([58daeb6](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/58daeb684f6e84fa0950d0ea5d9827881ba136c2))

### Fixes

* Add query parameter to static resources ([5f85441](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/5f85441b6e23a2bd2b3e1f3ef116a4868d5f9614))
* Update resource size in ConstantConverter ([6c30a25](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/6c30a2512bd30bf52deb4526d13416016004646f))
* Prevent errors in JSON storage when data is invalid ([4318479](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/43184791545bbf6fe8a840de07616fca8f3b7f97))
* Prevent errors during migration for invalid JSON ([2f928bd](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/2f928bd2d4c8d4385bca4554ad0ed19cc5aaa770))
* Disable submit buttons until form data is loaded ([1597a5a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/1597a5a5782ca5b574c42ab3bab3d01de89ccf02))
* Undo util.js errors introduced when changing lint settings ([261c3d0](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/261c3d05a6b446442f2ca5a4a0803363d1cb9021))

### Chores

* Update to TypeScript 5.2.2 ([edbf895](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/edbf895505d625d59404b82807616eebca757040))
* Fix Dockerfile to Node v18 to prevent build issues ([9cc4a9c](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9cc4a9ce4d786e76c54d126754271eb2ec1355a5))

### Documentation

* Explain storage/location import options ([01623e0](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/01623e0b5c58d77add4ab3e2a1a9082897ad5948))
* Fix outdated information in IDP documentation ([#1773](https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1773)) ([15a929a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/15a929a87e4ce00c0ed266e296405c8e4a22d4a7))
* Explain the patching store in-depth ([4d05fe4](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/4d05fe4315e282d6e1ec19af01b185cb21cab29c))

### Refactors

* Replace linting configurations ([6248ed0](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/6248ed093813e95255f031eb8fcc37e4d869235c))

## [7.0.1](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v7.0.0...v7.0.1) (2023-10-20)

### Fixes

* Remove duplicate identifier reference when disabling accounts ([f1fdbb0](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f1fdbb05b2575a56dbab4ed9ba38e8d31cfa65d8))

### Documentation

* Fix incorrect variable in documentation ([61b8d4a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/61b8d4a7e85c16580158f06cf25b6c3059ffe224))
* Update v6 references ([762d703](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/762d703df7d0f178cdbd0b53b21ef7ef9b2d4919))

## [7.0.0](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v6.1.0...v7.0.0) (2023-10-19)

### Features

* Add config option to enable account and pod creation ([9321add](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9321addafa7a63d42a1c11415a55af3e9c695e08))
* Update migration to clear all old non-account data ([9daeaf8](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9daeaf89ace822d8283a7a75b0d300628ab573d3))
* Use new MaxKeyLengthStorage to prevent keys that are too long ([b5a61cb](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/b5a61cbb08bc03a1e73ee713dde12921a6bfb515))
* Remove base64 encoding from storages ([e1c5189](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e1c5189cb809727ae1f97cc4a435baa6a60058e6))
* Support all notification methods in all default configs ([b54c6b9](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/b54c6b97b7931932ce0c9ed7e9d4fc42cb27156b))
* Add support for initializing a server with a root pod ([864dd7c](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/864dd7c2e015d33ef6535e7c3e882bc108bda224))
* Link to the account page in the pod README ([764b392](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/764b392b2b53b588dfb1cfce97e9ad677fe02aac))
* Update configurations so ldp/accounts/oidc can be disabled ([010017a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/010017a14176246d6a792f89b701c9a8655b70bb))
* Add migration for v6 account data ([0ac7d40](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/0ac7d407bfef2d880c59bc8fd1d809e69113d5f6))
* Allow ConditionalHandler to set the expected value ([fedd9e0](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/fedd9e04d8dd82b8eb4d1f8dac57ff65c0a96a6f))
* Create PodCreator class to contain most pod creation logic ([42a1ca7](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/42a1ca7b645d537b5539827e44f668d46b3ede38))
* Add support for pod owners ([cd07338](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/cd07338ce7132d84c8c18f9f6d935026cebc039e))
* Use IndexedStorage to store account data ([4230db5](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/4230db50382b05e454e27b28e7b8be3ac4858fed))
* Full rework of account management ([a47f523](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/a47f5236ef651dd8eaeb344fd83c7ef82f9730ac))
* Move storage location decision to separate import ([ade977b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/ade977bb4f86ae000cd70eec4b00e064f5bd7c4b))
* Remove setup ([5eff035](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/5eff035cb3095b43bf76e35dd55abf6e299d02ba))
* Update StaticAssetHandler to allow for easier overrides ([ea83ea5](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/ea83ea59a11ff127c21f33d111bd0ceb75460a25))
* Update oidc-provider to v8 ([7024ee9](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7024ee9a583144c223078ebac0f6685b704dac57))
* Introduce IndexedStorage for a more extensive storage solution ([3ade2ad](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3ade2ad795598a109a96f546e0512b116d66bc2f))
* Split up EncodingPathStorage functionality into different classes ([154d981](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/154d98168498a786368f75a01f51b902b8958ee8))
* Use ETagHandler for ETag generation and comparison ([afcbfda](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/afcbfdaacfb767d5cddefd90af5998158c44f727))
* Store ETag in metadata ([b608080](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/b608080d5f23a1326932b2b2c476db660e2dab2e))
* Add error causes to error serializations ([0245b31](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/0245b31e0c650d72190c467546bf0b40a62d800c))
* Add metadata to errors ([f373dff](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f373dff1d7185e71c3d9aa49d2b116cfe4b2dbcc))
* StaticAssetHandler can link a container to a document ([36ff95e](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/36ff95e6b289c854635e4a842a8550d9ee88ef24))

### Fixes

* Ensure setup values are migrated correctly ([7a44581](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7a44581406689c3ee3c6477832f7aa3bf4b76c8d))
* Be consistent in slash usage in storages ([f954fc9](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f954fc94509266c7a7e47ba27ee768888bd1034f))
* Encode notification keys before accessing the storage ([16378ec](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/16378ec4708ca39975a6a092b08ca0f3126583f4))
* Make sure stored tokens expire ([7504817](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/75048172dfc495c2ae621b04247295aefe60b136))
* Update generated keys in ExpiringAdapterFactory to prevent overlap ([2914fd7](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/2914fd7d6028532f3e9239643047bcc1a421ce3c))
* Fix issue in warning on pod settings HTML page ([7684198](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7684198b53e3f00a2de6f302a11ca3029176ba40))
* Add links on account page ([3bfd9e3](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3bfd9e329829176ec339edaf8165e03bedd3875f))
* Rename cookie field to authorization ([307dba3](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/307dba3219c15cd094d732e61f8f7e849fd72790))
* Update supported DPoP algorithms to run CTH ([1e3684b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/1e3684bcf3061d318768e1341acb04485123a906))
* Add workaround for authn library issue ([180d5f1](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/180d5f131e4498b91fb71a9e2e88cdfd7820e8aa))
* Use local file for oidc-provider typings ([b3ef4ed](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/b3ef4ed017a5630b85a76420c1d69fa06fc2b59c))
* Return WAC-Allow header in 304 responses ([43e8ef9](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/43e8ef99b0b5179715453d94168bef77576ad272))
* Return ETag in 304 responses ([baa6498](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/baa64987c6af92fb3964506c9a19d4b251a8f227))
* Add missing error causes ([7505f07](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7505f07f2fb7f9972e31f445fcd078590f1f0481))
* Make all ways to start the server more consistent ([e921d62](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e921d62630660dab9317ade1fb5583929eeb9f8a))

### Chores

* Make Node v18 the minimum supported version ([e0c1bae](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e0c1baeb437b64966f74edcdc37719e6945043f2))
* Test Node v20 ([43be71e](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/43be71e4a2ed73ad0ca106431aa0af43a3ccc1be))

### Refactors

* Use one identifier to reference main template engine ([92a0856](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/92a0856da6066b58d3c7a1437feadbf9f64abf76))
* Sort default config imports ([851eafd](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/851eafd1d15c12cd46b1c240f7702a35b1f042d9))
* Move single IDP configurations into one folder ([862ac48](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/862ac4867bad57694b4a2b565b5aaf94b332c277))
* Rename WebIdAdapterFactory to ClientIdAdapterFactory ([607c04f](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/607c04ff286a9842e12c750fcdf87b903a838f8a))
* Rename WebHook to Webhook ([531c299](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/531c299c7bc4d710361cedf5e8747835d62b2820))
* Move condition classes to separate folder ([5ec6edd](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/5ec6eddbfab57f88b92861d1f0a8ee6034a55526))

### Testing

* Workaround for Jest dynamic import issues ([cccca96](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/cccca96d28919338596b1a3690177e4b6427c85f))
* Workaround for Jest ESM issues ([bfa70a4](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/bfa70a40aa72d3db0347dbc6e28445a3d1499e64))
* Remove test tmp folder after all tests are finished ([9bf7348](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9bf734817deaaf3e06b0eccac2423092bd1427c5))
* Stop cleaning up folders after quota test to prevent CI issues ([3a57e88](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3a57e88229bafce23b4165ef15ebdfb1a1826b55))

## [6.1.0](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v6.0.2...v6.1.0) (2023-10-05)

### Features

* Track binary size of resources when possible ([71e5569](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/71e55690f3418be3d08e35d2cd3aeae5a0634654))
* Add support for range headers ([3e9adef](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3e9adef4cf00d0776c0d371f835a31511db7427b))

### Fixes

* Prevent error when creating a root pod([da46bec](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/da46becf7a087118e7d682a193d00a3ca6c32eab))
* Remove URL encoding from base64 strings before decoding ([d31393f](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d31393f4751dd3f023110ead4e47a01ac15da2af))

### Documentation

* Simplify README by pointing to our docs. ([d618f97](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d618f9781af80b1697d5fe23f50e3f186954792b))
* Add starting guide. ([e424b84](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e424b8488261bc8942d82a7fe2d92a94650e93b9))
* Add quick start to README. ([1fa6d24](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/1fa6d248a2e500c025794f4e3ed6cc504ed77f10))

## [6.0.2](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v6.0.1...v6.0.2) (2023-08-30)

### Fixes

* Have FixedContentTypeMapper ignore .meta ([9e682f5](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9e682f5c4f8ecd222ae633137ca455b1b9c5ce16))
* Ignore invalid header parts ([9c2c5ed](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9c2c5edaf514fe84594024710c03ab3b7b0fbed1))
* Do not show PUT in Allow header for existing containers ([6f6784a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/6f6784a28873c1a8a71bc8a6a37b634677109f02))
* Store activity streams context locally ([a47cc8a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/a47cc8a5eef4d0dd963f85d0ad0e4746ada48e19))

### Testing

* Clear test data folder before running tests ([6fc3f2c](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/6fc3f2cf4f23ffde40ba88305c4c67bf39b73e10))
* Enable file locker in notification tests ([f419f2f](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f419f2f28d664fad6d6e16cf89a6ebbd7d0f0052))

### Chores

* Name HTTP handlers ([937c41f](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/937c41fd17d553ddfc0d8f140867c252ec113ccb))

## [6.0.1](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v6.0.0...v6.0.1) (2023-06-15)

### Fixes

* Use correct type for Webhook notifications ([c0a881b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/c0a881b9809d3a551c4cdf63bbd89ce57f3fff8d))
* Make root storage subject of storage description ([9584ab7](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9584ab7549ecf7ab20fe1e6db28f3c900d9a5392))
* Prevent illegal file paths from being generated ([fdee4b3](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/fdee4b334fa456746e9d2097284321a6c1fa2362))

## [6.0.0](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v6.0.0-alpha.0...v6.0.0) (2023-05-02)

### Features

* Support both the old and new WebSocket specifications together ([4b7621f](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/4b7621f9e0be487fc5df47086572b24e9ed42475))
* Use WebSocket2023Channel identifier for WebSocket URL ([69af7c4](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/69af7c4e163038635b62f6bcc573d6d8e8d9fd37))
* Replace WebHookSubscription2021 with WebHookChannel2023 ([d59a159](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d59a1595d56a606deba42ae5605ffe4a3c250b6c))
* Allow unsubscribing from all notification channels ([e946348](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e9463483f4380c526b8a7b188e945a55123348d4))
* Restrict channels to 2 weeks by default ([f7e05ca](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f7e05ca31e718732540214bc3f4b9400e6564c11))
* Support Add/Remove notifications on containers ([134237a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/134237a80fab602d2aed61cb5ff499488a474d0b))
* Replace WebSocketSubscription2021 with WebSocketChannel2023 ([702e8f5](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/702e8f5f59e8bec2fb29000ec14239d3f2d00d36))
* Use URLs for channel identifiers ([cbbb10a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/cbbb10afa1f186a973d98a0ce55429cb5aee5a3a))
* Ignore unsupported notifications features in subscriptions ([67d1ff4](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/67d1ff4ac0a93c051e8491826414f3471c2f05aa))
* Support GET requests on subscription services ([65860f7](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/65860f77da56dfc80f68ea6a43b99ac3b3e202a5))
* Update notification object to match the updated examples ([7c343a5](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7c343a5fcce415251d25dfb184e5e8d3496c1710))
* Replace expiration feature with startAt and endAt ([caee563](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/caee563dd69a34944c9b175654e24946b264c2f9))
* Use notification v0.2 features in discovery ([10980e9](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/10980e90a31b5dff51e18ba52856ab486fefb2da))
* Support conditions for GET/HEAD requests ([f0596c2](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f0596c2eb8b1f62b31fdcd26070ea9fbf8468a74))
* Provide clear error message for unknown clients ([c332412](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/c332412074d3969420348687e8323fffaec2f882))
* SeededPodInitializer log exceptions as warning instead of crashing ([2efc141](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/2efc141baa11f4f2a0063c189843583a05cc4012))

### Documentation

* Explain changes to template folders ([a4d4118](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/a4d4118474324c9c2d00ee683348236da6b0789b))
* Describe how notifications work on the server ([1a1a6ee](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/1a1a6ee71467678eb9ad346a5550b75afe73c86b))
* Update RELEASE_NOTES with correct notification information ([40ad4a6](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/40ad4a61704d17213f9092933ee27ebd37714f6e))
* Add references to the configuration generator ([4b33017](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/4b3301738e3884a3b4324982c324463a1beb990c))
* Add responses when client credentials are incorrect ([50bb8cf](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/50bb8cf923cf6f7ea8e10e305df4959f7221275e))
* Add Zenodo badge in README ([5acddcb](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/5acddcb5b204fe91c0ed2f4b24c0241e851afd3a))

### Testing

* Fix Jest memory issues ([26f24aa](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/26f24aa76c1aadf5a0578bbf9d5bd6d3362377f6))

### Fixes

* Make sure locker allows reentrant lock acquisition ([5347025](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/53470257201999566e3012923af45c19f0a6a938))
* Make aggregated errors prettier ([0d5d072](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/0d5d072f79bc6f34c0080b8c626a4548ffaebb16))
* Support new ETag format in notification states ([b250bea](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/b250beaec902e4e564eea68318f9f9f3342c13b0))
* Minor documentation and configuration updates ([4ff6fe6](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/4ff6fe66eaaebc537cb73346ae997b09630ba879))
* Update the lastEmit value after sending a notification ([b2f4d7f](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/b2f4d7fb2dd9fa92c6fa5f57a0e3d93195343815))
* Replace inefficient storage detection ([23db528](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/23db528472169925b4705140424f6d470574760d))
* Use EqualReadWriteLocker with file locker to prevent deadlocks ([0a30be5](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/0a30be55ef433400965ff76581213b23f0e59a4e))
* Ensure the ETag is representation specific ([c3f48dd](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/c3f48ddb97c842dc3a2bbfd06230cb6caa10917d))
* Store internal JWK as JWKS to be backwards compatible ([7fd0b50](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7fd0b503837b378ff9a8764290938014a2a5a11a))
* Updated WrappedExpiringStorage to use timer.unref ([b6faed0](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/b6faed0db3cb2b6282acdafb64e1225c89e66842))
* Output required OAuth error fields ([63fd062](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/63fd062f16d2e88e86c1aa44733c3daddef2bb23))
* Do not add port 80 to default base URL ([bb74278](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/bb7427842c0f360852e33863972f14bc72d7502a))

## [6.0.0-alpha.0](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v5.1.0...v6.0.0-alpha.0) (2023-02-01)

### Features

* Hash lock-related identifiers ([0d6b895](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/0d6b895df361fef2dd79208605f3610a756ab178))
* Take preferences as input in `RepresentationConvertingStore` ([7422fbf](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7422fbffe7500780ed01d4cb6f9dea520456657a))
* Return clear error when multiple values for a cli flag are given ([5c79e60](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/5c79e60238955b1c9d14d22d8fcd51cd8bec1c39))
* Allow css configuration from package.json or config file ([d61bf9b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d61bf9bf1957fb706b2be2aaa016c367d2ae92f0))
* Remove agent/user permission differentiation ([c46d01d](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/c46d01d3d724e53a2eb9774f027fc0c5632d7dcf))
* Move WAC-Allow metadata collecting to HTTP handler ([6ad5c0c](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/6ad5c0c7977f4b53fe9d2249161b6157d056f9bb))
* Allow CachedHandler to cache on multiple object fields ([9b15b1d](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9b15b1d7e1e905ee03a0ec50e2e8b9daf69c1f00))
* Allow server to bind to Unix Domain Sockets ([bf0e35b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/bf0e35be37e666769a083a95d52e78335f1d993e))
* Add support for WebHookSubscription2021 ([f54c34d](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f54c34d1e066dfc4feddf592adbcca5f5b14bd4e))
* Add support for WebSocketSubscription2021 ([b1f7a6a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/b1f7a6a8b1a5d28a03d0d6f4620b3078acc4e31e))
* Add support for the Notification specification ([cbc07c6](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/cbc07c6ef3970083f0e513d15bc8f4d0a935b5d3))
* Create a CachedHandler that caches AsyncHandler results ([be7af27](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/be7af277bb35344df11c5785aca5263e056b35ba))
* Expose a storage description resource for storage containers ([df2f69f](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/df2f69f5327f097662ffead20b0c49f755e85d56))
* Create an OperationRouterHandler ([3db1921](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3db19216331ed789322a0509616a839bb890f788))
* Create an ArrayUnionHandler which flattens the sources results ([da99ff3](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/da99ff30f63b673ea272fc918c69c9ff4a5c0401))
* Split up server creation and request handling ([4223dcf](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/4223dcf8a48300cabc01bfa744ddf9e205808693))
* Create a GenericEventEmitter interface ([764ce3c](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/764ce3cc285ec5a41903c3018c2ae47444a1410d))
* Support async default values in getDefault ([a1e916b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/a1e916b73aa7aa8c5657ec030272192e68ac244a))
* Add required ACP headers ([fa1dee5](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/fa1dee573e9481ca901aa52da275014ac8964b2e))
* Update Credentials typings to support client/issuer ([f3e7a20](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f3e7a208002cc687505b06c6737785a02b71f733))
* Update templates and generators to support ACP ([40f2c8e](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/40f2c8ea42221fff706df66f01ddf6dccf58d462))
* Create configs for server with ACP authorization ([db68074](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/db680740b57a82bac90cb50b26b91395064dc4c0))
* Create AcpReader ([a6409ad](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/a6409ad00d8034931873accedc2884abf556e23e))
* Allow vocabularies to be extended ([97f7ca0](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/97f7ca027ea55a5ee9a80582671743f33237c571))
* Improve vocabulary typings ([2e1bae9](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/2e1bae90c7b06221b55ffb9382948a580e6408e4))
* Remove caching from AgentGroupAccessChecker ([3c43d04](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3c43d046ef726556c59abfee52c259b92ed6df94))

### Fixes

* Expose Www-Authenticate via CORS ([60718a1](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/60718a123d201d64315d03d5cd7977479d6cdc7f))
* Prevent accidental nested storages ([4d9d1b9](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/4d9d1b90b0d808d5807b8515e48fbee7ea6aaee0))
* Convert TemplateEngine to AsyncHandlers ([cf74ce3](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/cf74ce3d2a70d77d1139637191ad27c87704ab2e))

### Testing

* Reduce integration test memory usage ([80fa81a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/80fa81a556c78d252ee3419fcdfd778b1b2ddc79))
* Update PermissionTable to also test all ACP cases ([56b7e63](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/56b7e638430af0d6e09cb36ae63b472fd3d5aa64))

### Documentation

* Add links to tutorial repo ([f0c7c60](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f0c7c60619069d58e0c6b488e303cd9714477ec1))
* Add notification architecture documentation ([7b6ddfa](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7b6ddfa2729d0146e08fbd0a2f5e25698a248ba1))
* Document ACP-related changes ([c73ef50](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/c73ef50e48fdf8a1646ca8a77be5c6ffeb5e9562))

## [5.1.0](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v5.0.0...v5.1.0) (2022-11-03)

### Features

* Add additional redis settings to redis locker ([79fa83a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/79fa83a07ab6dded5c7d601dd7b165fa9178ef26))
* Add support for key namespacePrefixes in a RedisLocker instance ([d690cc7](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d690cc7ed02e2b0ab95fa20b8934ac31c44f8566))
* Allow JSON-LD contexts to be stored locally ([b0924bf](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/b0924bf168500070a287cef300047f874deebe0c))
* Allow multiple configurations to be used during startup ([e050f8b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e050f8be93b7ea9596fdaf250de9f0bf32fa4fd8))

### Fixes

* Require create permission for empty PATCH bodies ([68ee964](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/68ee9648e1c78684708f026d9f4b22ee1cc66790))
* Return correct status code when deleting non-existent resource ([ef48660](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/ef48660b482cb954e5b08e9c3799acfdba6d6f23))
* Fix incorrect config import ([e1af8ee](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e1af8ee66ef21ac9e0fac4379d7836b3338b8343))
* Add missing parameter to `sparql-file-storage.json` configuration ([f7742cf](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f7742cffefa2875442798a478a5d7a9960dbfa7e))
* Always render OIDC errors correctly ([7884348](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7884348c2f4e8f646f38cf987c58a8a47135facd))
* Clarify application consent screen. ([7987824](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/79878240682b2f7e335db4edd4c6a4ed8044a170))
* Prevent websockets from being used with worker threads ([327ce74](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/327ce7409ac3f62f8213bd8e300b3726fa848efb))
* Update metadata documentation ([abbf3dd](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/abbf3ddeef1494a84aa8e7293108ef63f47ac2d9))

## [5.0.0](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v4.0.1...v5.0.0) (2022-08-08)

### Features

* Accept both Settings and VariableBindings to create an App ([f609f1a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f609f1a9c5251b273ade785a798c1d6f8b7c29fb))
* Add a map that can check equality between object keys ([c35cd59](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/c35cd599a38700f8c5804053a180ad943f4f9d29))
* Add a SetMultiMap interface and implementation ([b5d5071](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/b5d5071403142cfb645c3992510bc01b3f05f399))
* Add contains function to IdentifierStrategy ([11c0d1d](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/11c0d1d6cf2898efab80c8e3f171f92b3d3b5aaa))
* Add find utility function for Iterables ([145758a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/145758adbf0088ac3923b3ec3d6a713c9a467173))
* Add utilities for Iterables ([45f8aa1](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/45f8aa157de93e7f9f4cf26727bdad9233223ed1))
* Allow switching accounts ([3fea5c9](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3fea5c98f5eef181bac7283943f2b35474821b17))
* Change permission interface to store identifiers ([23f0b37](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/23f0b37c2840035a436e0d140649bcb96e68c94e))
* Edit metadata resources ([#1188](https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1188)) ([ca62511](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/ca62511d12c1190e046c6608692784082323a161))
* Enable strict parsing of CLI arguments ([4e999eb](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/4e999eba98920cb82e64091646eb61a8abf63213))
* Extend OIDC error descriptions ([3f817b1](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3f817b14b0b7ee626d3f4e6922955392c00f8be2))
* Initial proposal for multithreaded execution ([236bbc6](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/236bbc6e5d02e42016290812318c1d62179cb6e1))
* Introduce ModesExtractor for intermediate containers ([18391ec](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/18391ec414df7b78185e2670327abfa06f3c285d))
* Parse Accept headers as early as possible ([df08259](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/df0825936afd211fe51cdc2ff2034b4ca34234b3))
* RegexRoutes stored as ordered array ([5399e75](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/5399e75ae4917f88b0909bf04849d51039ab5189))
* Respect root path for static assets and HTML links ([2814e72](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/2814e72b348212cb3f49e0eb1e6bcb69cf67c1a8))
* Rework ResourceStore to return extra info ([e0954cf](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e0954cf2a79cd9bb97dfc305afc1bd6782f0f59b))
* Split WebAclReader behaviour over multiple classes ([7996fe5](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7996fe5c3b6d05f3307f92f2ac2401d9c8ead408))
* Store turtle prefixes in metadata when parsing ([66e82dd](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/66e82dd772c6d6ff6eb4bf1f3e50c50a7ec3172d))
* Update configs based on all permission changes ([d5bcec7](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d5bcec704cc00a240634e3860e998f2bd861cf12))
* Update ModesExtractors to support new permission interface ([7085252](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7085252b3f22a856ffb6a257aa8d1b8f64c7163b))
* Update PermissionReaders to support new permission interface ([0ff05fd](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/0ff05fd420f869e187743163a2bce746100116f1))
* Update WebAclMetadataCollector to support new permission interface ([fd83f4b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/fd83f4b013fa4e1572ae6357971dc05bf9e57149))
* Use an IdentifierMap for ResourceStore responses ([9a12152](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9a121522537327e0872a98189cecb250691de210))

### Refactors

* Add imports that allow for HTTPS through CLI params ([9dcba1a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9dcba1a2881b5568a57d4a9fa287917ea32193c7))

### Fixes

* Introducing initializers for handling lock cleanup on start ([1c65b06](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/1c65b06392da60ad5178c7db86c1bd4d6d83f800))
* Logging component logs as coming from a worker ([c89cc4b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/c89cc4b395170e14759bebca2627d3a7830dcea3))
* Prevent FileSystemResourceLocker from writing to ./ ([a99616a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/a99616acf24ca28c904ca0f42f6793b0d7d42002))
* Remove MS-Author-Via header ([21b2850](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/21b285069646fd4e34d990a3ea18fcdc4a8cca44))
* Remove workaround for cli parameters being turned into string ([a99db00](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/a99db00fb2bc9926d911fa3859141984a1994442))
* Return contenttype header value string with parameters ([311f875](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/311f8756ec8ea74ab85fdcff09ac435364ca602d))
* Stop creating meta files for each new resource [#1217](https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1217) ([fbbccb0](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/fbbccb0cf1f7980c008ecc06cabccb8c08b48b5f))
* Update the default timeout to 6s ([839a923](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/839a923df64b3556ea339cc20b2fa336245ea7d3))

### Documentation

* Add architecture diagrams and documentation ([5288237](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/528823725a799c8b18a5060efefa20169fbd2c0d))

### Chores

* Add email to senderName for email sender ([3dc8b49](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3dc8b497bb62a4cadf1188fff391f2cd1f83406e))
* Update Components.js to v5.3.0 ([3e9989e](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3e9989ee1b0f87594959710a59dfc339cde058e2))

## [5.0.0-alpha.0](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v4.0.0...v5.0.0-alpha.0) (2022-05-05)

### Added

* Feat: add a process-/thread-safe file-based ResourceLocker ([fa78bc6](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/fa78bc68567d836927731eaa9a7d7f752dadae49))
* Feat: file-based backend fallback for unknown media types ([ff80079](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/ff80079000a0f308f31b83cfc52e90421f20dadc))

### Changed

* Fix: Fix typing issues with latest Components.js generator ([0e32d9a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/0e32d9ad9b3e8558c32bf7263e33af157b88a6a1))
* Fix([1de1f7c](deps): Update to Comunica v2 (<https://github.com/CommunitySolidServer/CommunitySolidServer/commit/1de1f7c12a8ae3f89fd91e9cb33af0405af7d995>))
* Refactor: Replace RedirectAllHttpHandler usage with RedirectingHttpHandler ([d2bc995](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d2bc995272ed596b2bd6acd0d4cab50fcb7859f0))

### Fixed

* Fix: Update prefixes in all configs ([ce27bec](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/ce27bec207652f0bd37beb23301f864464751438))
* Fix: Always define @type in configs ([cfdd122](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/cfdd1221f05f2b51abc770e64407bb8392224383))
* Fix: Change YargsCliExtractor structure to avoid Components.js issues ([6f4e70d](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/6f4e70dbb928a9cb64e83a71954ea607a0bdb1a0))

## [4.1.0](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v4.0.1...v4.1.0) (2022-08-04)

### Features

* Add test phase for docker images ([0159557](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/01595577a8b9aabf618ece4c261f95fc2082023f))
* Args as env vars ([a461586](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/a46158692178d30975f3a91a9ce2bbdbc4f5882f))
* Build versioned documentation site from CI pipeline ([027c803](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/027c803b33ff2309d09c1cc908b971c8ae785a43))

### Fixes

* Accept client WebIDs with a context array ([d290848](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d2908480960b9708460ad71c010ea11e86497968))
* Enable ACL in default quota config ([26b42f0](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/26b42f0b175293e266bd404a1dbe206d21154690))
* Improve HTTP stream error messages ([93a141d](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/93a141dd6160c0f55839dfec1312b9f085569bcd))
* Prevent JsonResourceStorage from generating too long filenames ([13dbcb6](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/13dbcb662b84ce926fcae832a16da47305e370f4))
* Rdf convertors should not read or write plain JSON ([9ecb769](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9ecb769e092cfb4cb08b514477f320956a4b302c))
* Rewrite request with a root path to OIDC Provider ([0a84230](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/0a84230307d72e1afa30386ff9dda160a9ca98d4))
* Use encrypted field to check for TLS. ([82f9070](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/82f90709a656b0d996118d2e869b6b4a2c8a2e5d))

### Chores

* Update dependencies ([15e756e](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/15e756efc1fa6c732b9872ea75249606ae9144a6))

### Documentation

* Update docs links to new documentation site ([d0f9d1e](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d0f9d1e24da7d89240efdbc11df7a5096841a398))

## [4.0.1](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v4.0.0...v4.0.1) (2022-05-10)

### Changed

* Chore: Fix oidc-provider library to v7.10.6 ([ef9dd43](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/ef9dd433464799f54eade34fe11de04c5ab3a70e))

### Deprecated

* Chore: Drop support for Node 12 ([3d6e3d2](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3d6e3d2e39ffd54ffed6fc0d24de97d50d45c96d))

### Fixed

* Fix: %2F not handled correctly in file backend #1184 ([dbdb9b4](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/dbdb9b424e4c4f68c19c66396064486bff93a7e4))
* Fix: Make delimiter encoding case-insensitive. ([50469e2](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/50469e2c1f3d9c808062fde96d2ce62d5e85475e))

## [4.0.0](https://github.com/CommunitySolidServer/CommunitySolidServer/compare/v3.0.0...v4.0.0) (2022-04-19)

### Added

* Feat: Support seeding pods and accounts ([c8d4bfe](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/c8d4bfec39e554fc920ece99d4272cff8128f342))
* Feat: Store content type parameters ([a860205](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/a8602055e67b5d23ec70f3cc0dbaee6b4235fda4))
* Feat: Pass access modes to PermissionReaders ([2ae5924](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/2ae5924dde55c53c8c58e447a3e3734e993287fb))
* Feat: Add CachedResourceSet ([0e4d012](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/0e4d012086801108c462d14cc52c669c7e59a232))
* Feat: Return 404 for read/delete requests if there is no resource ([e86e0cf](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e86e0cf36bb69858c514352c84b5ddc1900633f7))
* Feat: Check parent ACL permissions for create/delete requests ([d908374](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d908374364d3b3d72bf8cfe111d42634503e32fd))
* Test: Create permission table to automate tests ([6f83ac5](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/6f83ac5ead5bb98fae9c09d1996b4b5c2ce2fa51))
* Feat: Handle OPTIONS requests in OperationHandler ([ad3edcf](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/ad3edcf1a89257344d2209edd76b91f3eed9bc82))
* Docs: Write initial user documentation ([a5a34f5](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/a5a34f5071a97ab42c9f17bfe7727f21ccd2461d))
* Feat: Add utility functions for generating error classes ([f3dedf4](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f3dedf4e27234efd6caa8a04ad0d0318aa3ba01d))
* Feat: Store methods in MethodNotAllowedHttpError ([effc20a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/effc20a270baa2b9305eb11a7858fa2353ab4434))
* Feat: Dynamically generate Allow and Accept-* headers ([6e98c6a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/6e98c6aae4bfc53b5a002bf8314c83add9a129e5))
* Feat: Make LazyLoggerFactory buffer messages. ([238570b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/238570b3d29d19cbda8e3ba9263f34d4a5679ff4))
* Feat: Warn about UnsecureWebSocketsProtocol. ([5c21819](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/5c218193ab7ddf8ad80122279a52f1c06f662cea))
* Feat: Create MetadataParser that detects JSON with Context link and throws an error ([48efc6f](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/48efc6fae180108756550dc761b65fb1b71a4018))
* Feat: Add RedirectingHttpHandler ([468e11d](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/468e11d906e051a463d24ea21a7ad4db53dde5f5))
* Feat: Allow dynamically adding CLI parameters in configs ([bedab90](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/bedab907f9c62bb2e146188bf31c82272692465b))
* Feat: Add support for client_credentials authentication ([2ec8fab](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/2ec8fabd54823fd40ba194247715000a181f8076))

### Changed

* Refactor: Rename resourceExists to hasResource ([4404fa0](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/4404fa07d9238aed2afdce29e3a3d1eafed6af0b))
* Feat: Parse content-type more strictly ([027e370](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/027e3707fdc161fee005d4049648806f546d09d9))
* Feat: Create separate storage to generate keys ([a1a6ce0](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/a1a6ce01fa245e39acd7df5866b45c754704e9b9))
* Refactor: Move key/value storages to relevant configs ([30ad301](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/30ad3015f04a8ecad4e387906e0971345abbce39))
* Feat: Remove meta parameter from logging. ([2c6167e](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/2c6167e0cb57f97d412d97ddf84f5698a881175b))
* Refactor: Make Logger an interface. ([3685b7c](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/3685b7c659aadf583abe3c7442427682006049e3))
* Refactor: Use fs-extra instead of fs to simplify file access ([fe39f97](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/fe39f97ee0550065a65c8e221a5f51908922fd37))
* Feat: new helper functions to replace regexes #807 ([283c301](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/283c301f0833718b879cf2040fab3d70f72ebf53))
* Feat: Only accept NamedNodes as predicates for metadata ([668d0a3](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/668d0a331fb8da45b0dc8e72f05d0a47fbcedd2e))

### Fixed

* Fix: Prevent slugs with trailing slashes for non-container resources ([5965268](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/5965268ebfdb49f1ae4da3809c913016686cee07))
* Fix: Extract correct access modes from request ([9a29cc2](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/9a29cc22578c5a71667445b6b28a76c3eaaf61e4))
* Fix: Add IANA type to child metadata in FileDataAccessor ([7152897](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/7152897b89b6454142ade57e610588093bf03c5d))
* Fix: Support entries function in JsonResourceStorage ([7654801](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/76548011f22b3939a39c7ffae09e31805450bc0a))
* Fix: Prevent expired storage cleanup from crashing the server ([f08cdf7](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/f08cdf75f76d7e23b5d3277aae4a113380e245a7))
* Fix: Undo authorization on OPTIONS requests ([97e600b](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/97e600bf4f1e9e397de88239395216e05e6c3b4b))
* Fix: Throw error when accessing URLs out of scope ([d42125a](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/d42125a91d7d4a2dde5fc280869f99e10546731f))
* Fix: Add missing imports from default configs ([30799f6](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/30799f6667490f3105bca05784c6bbf0d38b36f3))
* Fix: Keep storage paths consistent with previous version ([570e167](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/570e167a36b8da14561680d2709190ea78e15b61))
* Feat: add a Redis based Read-Write Locker ([e2e2d08](https://github.com/CommunitySolidServer/CommunitySolidServer/commit/e2e2d0864f9b81c56fea61067acdc011347b2283))

## [3.0.0](https://github.com/solid/community-server/compare/v2.0.1...v3.0.0) (2022-02-23)

### Added

* Feat: Determine Typed Converter output based on input type ([fa94c7d](https://github.com/solid/community-server/commit/fa94c7d4bb0d67b0cde264f9515260293b3b904a))
* Feat: Add ContentTypeReplacer to conversion chain ([fdd42bb](https://github.com/solid/community-server/commit/fdd42bb7b3efda8bfac535ef4ff07f45ea4a524a))
* Feat: Add "no conversion" as possible path in ChainedConverter ([d52aa94](https://github.com/solid/community-server/commit/d52aa94e535768c183589179462af95814b51094))
* Feat: Support redirection through errors ([7163a03](https://github.com/solid/community-server/commit/7163a0317b80535ba85e636495cb48b61bb6e6f3))
* Feat: Move redirect support from IDP handler to specific handlers ([4241c53](https://github.com/solid/community-server/commit/4241c5348df880646ac39d34d0f733a0743fcb24))
* Feat: Create VoidLocker to disable locking resources ([9a1f324](https://github.com/solid/community-server/commit/9a1f324685216bd6346fb19e626dcca5145053df))
* Chore: Build and push official docker image in CI ([65d1eeb](https://github.com/solid/community-server/commit/65d1eeb0a2f3ab253efca50d98d6a14c3fa3103c))
* Feat: Add support for quota limits ([0cb4d7b](https://github.com/solid/community-server/commit/0cb4d7b16114ce9d0d4c5ae0766b4e4e944af9cf))
* Feat: Add support for N3 Patch ([a9941eb](https://github.com/solid/community-server/commit/a9941ebe7880cc9bb136786d721c1ba76bda888a))
* Feat: Allow for custom CLI and variable options ([c216efd](https://github.com/solid/community-server/commit/c216efd62fcc05aa1db5a0046c3dbc512e7f2d62))
* Feat: Send reset password recordId as query parameter ([8f8e8e6](https://github.com/solid/community-server/commit/8f8e8e6df4a4a5d8759c95c2a07e457050830ed6))
* Feat: Split up IDP HTML, routing, and handler behaviour ([bc0eeb1](https://github.com/solid/community-server/commit/bc0eeb1012e15e9e9ee0f9085be209f6a9229ccd))
* Feat: Update IDP templates to work with new API format ([a684b2e](https://github.com/solid/community-server/commit/a684b2ead7365b9409d7f2f4cfa6755e8b951958))
* Feat: Simplify setup to be more in line with IDP behaviour ([9577791](https://github.com/solid/community-server/commit/95777914729890debe0d4815c084029864afaf23))
* Feat: Return client information from consent handler ([e604c0c](https://github.com/solid/community-server/commit/e604c0c2e427f7cf426cda6e3a52c2d72b997057))
* Feat: Warn users when they change the base URL ([62e2210](https://github.com/solid/community-server/commit/62e22100238f1b9dfb13b9f350fccf12184f728b))
* Feat: Store the server version on start ([2dc20fe](https://github.com/solid/community-server/commit/2dc20fe3bc63da1d0a39720410da07f316b253ac))

### Changed

* Refactor: Create BaseTypedRepresentationConverter ([27306d6](https://github.com/solid/community-server/commit/27306d6e3f6f3dda09914e078151a8d07e111869))
* Feat: Update IDP parameters to latest Solid-OIDC version ([fc60b5c](https://github.com/solid/community-server/commit/fc60b5c161853845d1f3e6405e1182948cca421b))
* Feat: Move OIDC library behaviour to separate path ([520e4fe](https://github.com/solid/community-server/commit/520e4fe42fe14ec80ef0718c7f1214620fdae218))
* Fix: Update OIDC provider dependency to v7 ([c9ed90a](https://github.com/solid/community-server/commit/c9ed90aeebaabca957ae1980738f732e5472ee9d))

### Fixed

* Fix: Prefer all inputs equally when generating quads ([c6544fa](https://github.com/solid/community-server/commit/c6544fac1db432d1e0ce323bf439c48a7ed5dc52))
* Fix: Handle JSON preferences correctly in dynamic converter ([4d319d2](https://github.com/solid/community-server/commit/4d319d2564e953514c94cbadf93e28fefc501e86))
* Fix: Make UnionCredentialsExtractor tolerate failures. ([c13456c](https://github.com/solid/community-server/commit/c13456c2259538e502a59ce73a226bab2c99c395))
* Fix: Accept lowercase Authorization tokens. ([9c52011](https://github.com/solid/community-server/commit/9c52011addde6cbdfd22efeb9485841c640363be))
* Feat: Return correct status codes for invalid requests ([1afed65](https://github.com/solid/community-server/commit/1afed65368f98f4fda7bdd8f9fc5071f51d4dc5b))
* Fix: Split AccountStorage and ForgotPasswordStorage (expiring now) ([d067165](https://github.com/solid/community-server/commit/d067165b68a824143ff65f289d8a1e5e53d15103))
* Fix: Add content-negotiation when fetching dataset from url ([ce754c1](https://github.com/solid/community-server/commit/ce754c119fb87dc8a4f79c639e316bd04d40109b))
* Fix: Prevent login page from showing error before redirect ([1ed45c8](https://github.com/solid/community-server/commit/1ed45c8903e8750b818885cb6e48183e4c36f22a))
* Fix: Make IDP routes independent of handlers ([1769b79](https://github.com/solid/community-server/commit/1769b799df090a036f2d2925c06ba8d9f7130e6b))
* Fix: Improve OIDC error descriptions ([e9e3c6d](https://github.com/solid/community-server/commit/e9e3c6df3c945e187ae351f15bfe1a6df75e47a9))

## [2.0.1](https://github.com/solid/community-server/compare/v2.0.0...v2.0.1) (2021-11-02)

### Added

* Feat: Display symlinks in container listings. ([2e45899](https://github.com/solid/community-server/commit/2e4589938f4475a1a776dbc82ca4fd1501360764))

### Fixed

* Fix: Added a content-type parser to HeaderUtil ([54ccbed](https://github.com/solid/community-server/commit/54ccbed48dcce890df02d230c64a51d15f5ca6b5))
* Fix: Allow URLs with multiple leading slashes. ([b42150c](https://github.com/solid/community-server/commit/b42150cf52212ff2d6ba76e0db78faf71b10db89))
* Fix: Do not serve UI on special pages. ([8c9887f](https://github.com/solid/community-server/commit/8c9887feea7ac27d8acf67f4a0cd52f3e417a483))

## [2.0.0](https://github.com/solid/community-server/compare/v1.1.0...v2.0.0) (2021-10-15)

### Added

* Feat: Keep track of last modified date of resources ([97c534b](https://github.com/solid/community-server/commit/97c534b2bf3a4b7821397ef46aa0ae724a023bb5))
* Feat: Expose Last-Modified and ETag headers ([77d695c](https://github.com/solid/community-server/commit/77d695c8b6d23b143536eaddd70a8e593926032c))
* Feat: Create conditions based on input headers ([20f783a](https://github.com/solid/community-server/commit/20f783a5811810fa062a61876ebd9bce76a04d75))
* Feat: Verify conditions in DataAccessorBasedStore ([0d42987](https://github.com/solid/community-server/commit/0d42987bbd2d68bfbc81e5270e16870d994f322e))
* Feat: Use RequestParser and ResponseWriter for IDP ([7b7040a](https://github.com/solid/community-server/commit/7b7040a1969d10c5dbe30ba70499873941d1f97a))
* Feat: Support content negotiation for IDP requests ([80ebd02](https://github.com/solid/community-server/commit/80ebd02cc40773f7971bb24ef7ba071eb37db7f0))
* Feat: Add support for agentGroup ACL rules ([401923b](https://github.com/solid/community-server/commit/401923b792b6d1dcd51b6645cf414274560fd38d))
* Feat: Support LDN inbox headers ([759112b](https://github.com/solid/community-server/commit/759112bc04fe3395894dac8a419c59e7d611155d))
* Feat: Convert IDP input data to JSON ([4f1a86d](https://github.com/solid/community-server/commit/4f1a86dfa0ef91afa44d94494421d79808b43a1c))
* Feat: Support JSON errors ([cc1c3d9](https://github.com/solid/community-server/commit/cc1c3d9223aede72232bb716be20030406179297))
* Feat: Patch containers by recreating Representation from metadata ([ef9703e](https://github.com/solid/community-server/commit/ef9703e2846efc6638d08667598b1e7045a8e58b))
* Feat: Create SetupHttpHandler ([4e1a2f5](https://github.com/solid/community-server/commit/4e1a2f5981a3b902dfea40ea4e8a710ce88e9cf6))
* Feat: Integrate setup behaviour ([b592d44](https://github.com/solid/community-server/commit/b592d449ebece81875e37ccc0fe8dfa4a3124a70))
* Feat: Let CredentialsExtractors specify what type of Credentials they generate ([c3fa74d](https://github.com/solid/community-server/commit/c3fa74de78efbcbd5008f42877cdeed92dfa9f9b))
* Feat: Create UnionHandler to combine AsyncHandler results ([62f026f](https://github.com/solid/community-server/commit/62f026f2bc259125baf28b6c1338e05c3046dafb))
* Feat: Combine the results of multiple CredentialsExtractors ([ba1886a](https://github.com/solid/community-server/commit/ba1886ab85d222cc38c78a57b3256b5b4403ae99))
* Feat: Extract set of required modes instead of PermissionSet ([e8dedf5](https://github.com/solid/community-server/commit/e8dedf5c239f12c36b414c1dd9c6419a31f467de))
* Feat: Use PermissionReaders to determine available permissions ([bf28c83](https://github.com/solid/community-server/commit/bf28c83ffab3c9779e28284a313bfdff31e62c2b))
* Feat: Create OperationMetadataCollector to handle operation metadata ([5104cd5](https://github.com/solid/community-server/commit/5104cd56e896c654873a68e3f13d1776d93b98fa))
* Feat: Store account settings separately ([6c4ccb3](https://github.com/solid/community-server/commit/6c4ccb334de93d42451f9443afebfc0bc264b95b))
* Feat: Always grant control permissions to pod owners ([8f5d619](https://github.com/solid/community-server/commit/8f5d61911d771c623cfb20b0ecded3ea913fc899))
* Feat: Support acl authorization for IDP components ([13c4904](https://github.com/solid/community-server/commit/13c49045d47ef685223941bb926a9d34bace14c8))

### Fixed

* Fix: Explain why logging in will not work ([a062a71](https://github.com/solid/community-server/commit/a062a710bca6148b38050083786eb5ca5dfd5459))
* Fix: Prevent parent containers from storing generated metadata ([7f3eab0](https://github.com/solid/community-server/commit/7f3eab0b20e6f9a92c8abf642e82cd55440142fe))
* Fix: Make json-ld prefix generation deterministic ([a75d5aa](https://github.com/solid/community-server/commit/a75d5aa63c55b7481ea4b3aa7cd4b2eb1f8daa5b))
* Fix: Hide internal data by making it auxiliary ([0271133](https://github.com/solid/community-server/commit/0271133d33b27a0fe5faec8e0a556becdcd15d79))
* Fix: Only check DataAccessor canHandle call for Documents ([a1c3633](https://github.com/solid/community-server/commit/a1c3633a25d09633cac46a77b85f05a31b1a28b7))
* Feat: Replace acl specific permissions with generic permissions ([7f8b923](https://github.com/solid/community-server/commit/7f8b923399d0b9510ed1aaf4615e49b568ae5ea7))
* Fix: Add required triple to pod README acl ([f40e2c7](https://github.com/solid/community-server/commit/f40e2c768f54c7c78972c2ea3ffaec8d365a7aa6))
* Fix: Let Representations always have a body ([5613ff9](https://github.com/solid/community-server/commit/5613ff9e71a31c1d75589e7bcabfb6209e397902))
* Fix: Return 201 when creating new resources ([76c87bb](https://github.com/solid/community-server/commit/76c87bb56ae68e78bedc69a0798a149a187ed472))
* Fix: Return 409 when there is a slash semantics issue ([fb3a59c](https://github.com/solid/community-server/commit/fb3a59c0541fef61be622a18a79c822192c85420))

### Changed

* Change: Rename resourceStore to aclStore. ([60fc273](https://github.com/solid/community-server/commit/60fc273ea5364e59361aa1542839bc09c3bb3bc3))
* Refactor: Restructure source code folder ([b3da9c9](https://github.com/solid/community-server/commit/b3da9c9fcfb642e8a8a6d537b2e69cbd74ee8a88))

## [1.1.0](https://github.com/solid/community-server/compare/v1.0.0...v1.1.0) (2021-09-03)

## Added

* Feat: Throw error when trying to complete interaction out of session ([cb227d6](https://github.com/solid/community-server/commit/cb227d6431e8fe891752c7a52d216a0877f9d38e))
* Feat: Indicate to templates if this is part of an auth request ([f71f868](https://github.com/solid/community-server/commit/f71f8683fc0f4e40de2e1c64547397f32c0b6472))
* Feat: Allow filtering in ConstantConverter based on type ([ab06dd3](https://github.com/solid/community-server/commit/ab06dd30f3f8b0538b693fe50dd3d1f70c035b25))

## Fixed

* Fix: Allow clients to be remembered in the SessionHttpHandler ([47b3a2d](https://github.com/solid/community-server/commit/47b3a2d77f4a5b3fa5bab364ac19dc32d79a89c1))
* Fix: Convert data to SparqlDataAccessor in regex config ([f34e124](https://github.com/solid/community-server/commit/f34e124e1b88c59b4e456b3f69d9373e61550bd1))
* Fix(deps): update dependency @solid/access-token-verifier to ^0.12.0 ([7928f43](https://github.com/solid/community-server/commit/7928f43f443f914c7850a968912f19a78212d266))

## [1.0.0](https://github.com/solid/community-server/compare/v1.0.0-beta.2...v1.0.0) (2021-08-04)

### Added

* Feat: Create ChainedTemplateEngine for combining engines ([18a7103](https://github.com/solid/community-server/commit/18a71032c0ba872a3acd08fa1c63136fdf6489de))
* Feat: Accept asset paths as config. ([f28279e](https://github.com/solid/community-server/commit/f28279e3a577072adb9ff27b2a54a1624076a448))

### Changed

* Change: Use @css: instead of $PACKAGE_ROOT/ ([1719857](https://github.com/solid/community-server/commit/1719857e4b340fd16cdde9d9a45097072cc68fe2))

### Fixed

* Fix: Replace rimraf with fs-extra.remove ([2a82c4f](https://github.com/solid/community-server/commit/2a82c4f06e25981205d0841fe473d038888bc3ef))

## [1.0.0-beta.2](https://github.com/solid/community-server/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2021-07-30)

### Added

* Feat: Allow registration to be disabled ([916dce5](https://github.com/solid/community-server/commit/916dce5bd5eb28bfeacfc294cb689614b2386c36))
* Feat: Prevent access to internal storage containers ([7b94b71](https://github.com/solid/community-server/commit/7b94b71e7ed087ee065608d300b8bae9989642b7))
* Feat: Cache static assets. ([745eef7](https://github.com/solid/community-server/commit/745eef798a6fe8a0900c99a10c0b04db959f6663))
* Feat: Update ExtensionBasedMapper custom types ([3f8f822](https://github.com/solid/community-server/commit/3f8f822d819720f69f8ef362feeaa2b126d3220a))
* Docs: Make registration form self-explanatory. ([969bb0e](https://github.com/solid/community-server/commit/969bb0ee6c1706b2541ae2dc520f8a2dff5e9ede))

### Changed

* Refactor: Rename AllowEverythingAuthorizer to AllowAllAuthorizer ([dee3828](https://github.com/solid/community-server/commit/dee382849d742afff20ad2c8c02dba976a7195d8))

### Fixed

* Fix: Trust X-Forwarded headers in the IDP ([2df3f1f](https://github.com/solid/community-server/commit/2df3f1f28c6e56ef0333bf91e86ad5d60f8396d9))
* Fix: Prevent cyclical dependency with locker and storage ([45f9a51](https://github.com/solid/community-server/commit/45f9a51d7cc45d5aa85e2f439d93d2ba06e84159))
* Fix: Use memory key/value storage for sparql backends ([c01e33e](https://github.com/solid/community-server/commit/c01e33ecd9b25efa9219cc98519de8042b3ad380))
* Fix: Expose WAC-Allow via CORS. ([0271536](https://github.com/solid/community-server/commit/02715363139e7fd193e9ffae6bbffa9288948316))
* Fix: Expose Link via CORS. ([643cece](https://github.com/solid/community-server/commit/643ceced362dc5d002b98ab044b597b7ad11d182))

## [1.0.0-beta.1](https://github.com/solid/community-server/compare/v1.0.0-beta.0...v1.0.0-beta.1) (2021-07-23)

### Added

* Feat: Support metadata in multiple graphs ([35a7cf9](https://github.com/solid/community-server/commit/35a7cf988c139de0c7bf3f6e821ea4a52e83d2b4))
* Feat: Allow HttpErrors to store cause and errorCode ([e44c337](https://github.com/solid/community-server/commit/e44c337d0f3b7a4090ce9602f954540a5180ca3b))
* Feat: Convert errorCodes using markdown ([f2f967f](https://github.com/solid/community-server/commit/f2f967ff8add626aa47a6b2da48071bcde18c12d))
* Feat: Add IndexRepresentationStore to support index resources ([cc1e332](https://github.com/solid/community-server/commit/cc1e33239417fe9cd45c07af0e5f03d09c5980a1))
* Feat: Style main template. ([264b970](https://github.com/solid/community-server/commit/264b9707ace44c3758f2045f0a15db5635073f54))
* Refactor: Match IDP templates to main template. ([6897784](https://github.com/solid/community-server/commit/6897784a92edc072ef9d0ac29ab5f6bf77d72638))
* Feat: Render Markdown documents as HTML. ([c0dac12](https://github.com/solid/community-server/commit/c0dac12111ccbd3fb9473a0c010bda4760d1c84b))
* Feat: Add HTML container listing. ([1394b9c](https://github.com/solid/community-server/commit/1394b9cb56c38599ae9cb36af223952be046b5d9))
* Feat: Add support for client_id WebIDs ([3bb7a32](https://github.com/solid/community-server/commit/3bb7a32c0ca6b672fc9f576e24b7c3c2c299e03d))

### Changed

* Feat: Split ResourceStore config into 2 parts ([ad7f4ed](https://github.com/solid/community-server/commit/ad7f4ed134ea387352806c992713caad6039d0ca))

### Fixed

* Fix: Use #me for WebID generation ([ee456a5](https://github.com/solid/community-server/commit/ee456a5c110bf480ddd18351e57067c67c161d7f))
* Fix: Fix incorrect path in https example config ([0c3210f](https://github.com/solid/community-server/commit/0c3210fae724870809d462aaa1c5fedf336d8f54))
* Fix: Always find the best path with ChainedConverter ([e7ff134](https://github.com/solid/community-server/commit/e7ff134b258f984f241969d4ba18dfe0525d5f6a))
* Fix: Prevent generated metadata from being stored ([12e5018](https://github.com/solid/community-server/commit/12e501844fe925747b5740bd0987b1716deafee9))
* Fix: Throw internal error with invalid ACL. ([e43b579](https://github.com/solid/community-server/commit/e43b579ae7a14a0b7be5c89545922346c7fb3833))
* Fix: Make sure there is always a fallback for error handling ([bd10256](https://github.com/solid/community-server/commit/bd10256e5901320d9736310868bed1d820aba5d1))
* Fix: Remove the cache from the ChainedConverter ([fe8d579](https://github.com/solid/community-server/commit/fe8d579c72bb5b146e638647644252f05e4bd353))

## [1.0.0-beta.0](https://github.com/solid/community-server/compare/v0.9.0...v1.0.0-beta.0) (2021-06-29)

### Added

* Feat: Support creation of HTTPS server ([7faad0a](https://github.com/solid/community-server/commit/7faad0aef0f0d9d5c106e57c16e17340cb1ba303))
* Feat: Combine pod creation with IDP registration ([4d7d939](https://github.com/solid/community-server/commit/4d7d939dc4ab0a4da3eca6e0656cb0325aba06e2))
* Feat: Create ErrorHandler to convert errors to Representations ([e1f9587](https://github.com/solid/community-server/commit/e1f95877dac6a8f77d2c7a687bf478440ee5cb17))
* Feat: Add showStackTrace CLI variable ([b604dd8](https://github.com/solid/community-server/commit/b604dd8331e1c7682dd6080c696981855e277df6))
* Feat: Create WWW-Authenticate metadata writer ([e3c5b39](https://github.com/solid/community-server/commit/e3c5b3975266e5eee3939f9d1e8f5e0537417782))
* Expose constant Allow header ([a6371b0]([a6371b0](https://github.com/solid/community-server/commit/a6371b073597ae922c3374d952dfdf2f920017ac))
* Feat: Add ErrorToHtmlConverter using templates ([9c0fa77](https://github.com/solid/community-server/commit/9c0fa775276b8ba3383d25a155a2507309e0a1de))
* Fix: Support BGPs with variables in SPARQL UPDATE queries ([f299b36](https://github.com/solid/community-server/commit/f299b36e2429245bf82be85ca0cccf733d658619))

### Changed

* Refactor: Move config templates to templates folder ([fadbaef](https://github.com/solid/community-server/commit/fadbaefce239e2367c0d24727edf1afb14cbf03d))
* Feat: Split preset configurations by feature ([452032e](https://github.com/solid/community-server/commit/452032e3120d490d7261b9d304c8c393410f0406))
* Feat: Remove /interaction/:uid from IDP URLs ([df33b6d](https://github.com/solid/community-server/commit/df33b6dc472490568490ad5de4a011938e9cb205))

### Fixed

* Fix: Support missing type preferences in ChainedConverter ([52a3b84](https://github.com/solid/community-server/commit/52a3b84ee0dd55baed0dd244f75c12d06ed77666))
* Fix: Add solid_oidc_supported to openid config ([b328f9a](https://github.com/solid/community-server/commit/b328f9a1b06e2bc7994a82d4a7f90712a19c9b88))

## [0.9.0](https://github.com/solid/community-server/compare/v0.8.1...v0.9.0) (2021-05-04)

### Added

* Feat: Add identity provider (#455) ([1d65143](https://github.com/solid/community-server/commit/1d65143e89d4d64663805467a1587850690eeb59))
* Feat: Add redis based locking mechanism ([99d0173](https://github.com/solid/community-server/commit/99d0173213be4b05bc78b80ac108cbb5f0906ad6))
* Feat: enable more compact config props using type-scoped contexts ([2861b90](https://github.com/solid/community-server/commit/2861b902c476c456b9e5c208ab5048fc6e318421))
* Feat: Update ChainedConverter to create dynamic paths ([44d82ea](https://github.com/solid/community-server/commit/44d82eac045fc3a5e8ae4b5407fc1989889f9e27))
* Feat: Expose AppRunner.run for easily serving from JS apps ([d1eadd7](https://github.com/solid/community-server/commit/d1eadd75e73e79fe3c50034f151c6a4e93844c14))

### Fixed

* Fix: Prevent CliRunner tests from outputting errors ([a00de24](https://github.com/solid/community-server/commit/a00de24ec0ffb213dacd1bc5de09c1e7d0094eeb))
* Fix: Use HttpErrors instead of Errors ([218c8f4](https://github.com/solid/community-server/commit/218c8f4662b41f8f4d534d8b54f912664c365769))
* Fix: Prevent HttpRequest from being closed ([9534582](https://github.com/solid/community-server/commit/953458231b4b7149056cf6fe6887a1eef7a87737))
* Fix: Allow owners to edit their own profile ([7aebab1](https://github.com/solid/community-server/commit/7aebab1173c8a66b6f3630c8c8805021dc869367))

## [0.8.1](https://github.com/solid/community-server/compare/v0.8.0...v0.8.1) (2021-03-23)

### Added

* Feat: Fallback to X-Forwarded-* headers ([de51a23](https://github.com/solid/community-server/commit/de51a231e3b924de1c857b26eb85fb3b5bdef52b))
* Feat: Added oidc validation triples to template ([e2284c4](https://github.com/solid/community-server/commit/e2284c4c42e22cd933f77ef0b6d6a4120c902778))

### Fixed

* Fix: Make new pod profile card public ([613dd56](https://github.com/solid/community-server/commit/613dd5698a530bf4bd718850d8945f7300f19e58))
* Fix: Fix issue when there are multiple values for the same CLI parameter ([dd5b496](https://github.com/solid/community-server/commit/dd5b496f1d6b7727b034890dff6c8a43bbcd0ddc))

## [0.8.0](https://github.com/solid/community-server/compare/v0.7.0...v0.8.0) (2021-03-04)

### Added

* Feat: Static favicon asset ([03e631f](https://github.com/solid/community-server/commit/03e631ff178c48aeaafefe63e0027638f6e3b524))
* Feat: Introduce internal storing mechanism ([59deb98](https://github.com/solid/community-server/commit/59deb989eccbb4368a97088d4b6fcb612a988341))
* Feat: Create GreedyReadWriteLocker using read/write locking algorithm ([a3f41c1](https://github.com/solid/community-server/commit/a3f41c1d431c3e1582cd87971434282a46408d09))
* Feat: Introduce generic auxiliary resource support ([d6cdd7d](https://github.com/solid/community-server/commit/d6cdd7dbdfe09d3ae90279d4eca2cb0b9c7d74f9))
* Feat: Support auxiliary behaviour in DataAccessorBasedStore ([0c04723](https://github.com/solid/community-server/commit/0c047234e32f6c459f2dad2011014cd8195b43fd))
* Feat: Add WAC-Allow header when required ([1393424](https://github.com/solid/community-server/commit/139342470ee013a66466a79a868b8dbf52e9c969))
* Feat: Emit container pub event on PUT. ([c3cff55](https://github.com/solid/community-server/commit/c3cff553e3775842e3a2c9554111cdbbf4467e98))
* Feat: Create SubdomainExtensionBasedMapper ([bdb3621](https://github.com/solid/community-server/commit/bdb3621ee33e513bf6b6086e502940433c118946))
* Feat: Added resourceExists method to ResourceStore ([b3f292d](https://github.com/solid/community-server/commit/b3f292d71880bf2654aed3da17a5b55173f159ce))
* Feat: Solid community server Docker image ([52551ac](https://github.com/solid/community-server/commit/52551ac773cf0012387b664880756870df4d81bd))
* Feat: Create pod manager for generating dynamic pods ([88d008e](https://github.com/solid/community-server/commit/88d008e36fb573bc7edb29dc565d022be19551e8))
* Feat: Create KeyValueStorage with a JSON file backend ([6288003](https://github.com/solid/community-server/commit/6288003915bda84401a82de3ad62265485e6503d))
* Fix: Error when unknown parameters are passed to the main executable ([1589def](https://github.com/solid/community-server/commit/1589def0664fd33a4aeac629d207e97a2b093bd3))

### Changed

* Feat: Replace express with native http module ([ce1f430](https://github.com/solid/community-server/commit/ce1f4300ff5444626bbbb1bc7bee8e40d3bb65f7))
* Feat: Make stores return modified resources. ([6edc255](https://github.com/solid/community-server/commit/6edc255707d93cb3b9b7d62323802c6a3ff1a8cb))
* Change: Query string does not influence identifier. ([a57105b](https://github.com/solid/community-server/commit/a57105be8e08f8b39bd827a56fc6cf14d4425419))

### Fixed

* Fix: Do not re-encode static assets. (#566) ([c899e6c](https://github.com/solid/community-server/commit/c899e6c4b1ab714347f49006b96615ad54fdb387))
* Fix: Preserve query string in transformations. ([6e50443](https://github.com/solid/community-server/commit/6e50443a3930adb14a483899b87589ccf42e7596))
* Fix: Test error classes correctly ([c29928c](https://github.com/solid/community-server/commit/c29928c32c0d2ce5c97889edb3bd73904ab6077e))
* Fix: Close unpiped streams ([386d782](https://github.com/solid/community-server/commit/386d78277dc7dda340c284bfff1ef8c40605e7ed))
* Fix: Prevent race condition in OPTIONS call ([73acb9c](https://github.com/solid/community-server/commit/73acb9cd52d056526bc4c3812eaaebd54bd11840))
* Fix: Fix problem with piping streams for PATCH requests ([6c4378a](https://github.com/solid/community-server/commit/6c4378a2de290d4925f14f642697523ff38aa6e3))
* Fix: Fixed bug with empty Accept headers and internal/quads bodies ([59600b0](https://github.com/solid/community-server/commit/59600b07f88027d0bd4ac641919e990ca8016642))
* Fix: Simply GuardedStream check ([c05933f](https://github.com/solid/community-server/commit/c05933f652857aec6975c7c38418805d0171cb88))
* Fix: Prevent setRepresentation crash if there is no root container ([6424b07](https://github.com/solid/community-server/commit/6424b07fc6212b1069b519732a82553870f28fb0))
* Fix: Remove default root container from InMemoryDataAccessor ([bb65630](https://github.com/solid/community-server/commit/bb6563044190b521d7d06ad3af0e5e3c482907af))
* Test: Remove root folder creation from integration tests ([49a04c4](https://github.com/solid/community-server/commit/49a04c4d0a4cf0ff108b201ff0f587e996a45081))
* Fix: Make mkdir recursive in FileDataAccessor ([30cebec](https://github.com/solid/community-server/commit/30cebec32a1b15b0dd57d6072dda78e35026083a))
* Fix: do not output filesystem container size ([1486f01](https://github.com/solid/community-server/commit/1486f01aaf714aba945df5f31f17cb5e96002d1a))
* Fix #621: acl:AuthenticatedAgent instead of foaf:AuthenticatedAgent ([91791a0](https://github.com/solid/community-server/commit/91791a0a140a9b1c80c2d7d9dde910c90b2062d8))
* Fix: Allow non-variable BGP boedies in SPARQL updates ([894d458](https://github.com/solid/community-server/commit/894d4589d96533e9432c63911adc355c0785f0e0))
* Correctly handle slugs in POST requests ([28c0eb7](https://github.com/solid/community-server/commit/28c0eb7e887f907fc4ca3a5045d9eb71cf0b0491))
* Fix: Update faulty token verifier ([5c6822d](https://github.com/solid/community-server/commit/5c6822d4686585a03631b371427c7e2151ab65c7))
* Fix: SPARQL PATCH Content Type ([2a34a43](https://github.com/solid/community-server/commit/2a34a430fa7435df01743e7f8ac7de014d259405))
* Fix: SPARQL body parser test content type metadata ([23473f5](https://github.com/solid/community-server/commit/23473f59e69c1e028c7796996d98cf571277ad14))

## [0.7.0](https://github.com/solid/community-server/compare/v0.6.0...v0.7.0) (2021-01-28)

### Added

* Feat: Update config to include LockingResourceStore ([69c3144](https://github.com/solid/community-server/commit/69c31446ddad03308037d8b7992ea0e220dd2ed2))
* Feat: Add ConstantMetadataWriter. ([fe3957f](https://github.com/solid/community-server/commit/fe3957f0aeb8e55da65de4c88a1f5beb7d098b42))
* Feat: Set MS-Author-Via header. ([8c2f737](https://github.com/solid/community-server/commit/8c2f737fe0b7ce8bd435290fcee5b2c65823fce4))
* Feat: Set Accept-Patch header. ([153d2d9](https://github.com/solid/community-server/commit/153d2d9fe44a8993da94ebc513e7b520f0b7eea8))
* Feat: Add acl link header writer ([2c33000](https://github.com/solid/community-server/commit/2c3300028e0bd182a2296db83dfb74db3daaf219))
* Feat: Add ParallelHandler. ([817cf3a](https://github.com/solid/community-server/commit/817cf3ac0d8f2d37cd950c52e5a0f74bd3644e33))
* Feat: Support folders in StaticAssetHandler. ([2563335](https://github.com/solid/community-server/commit/2563335403c859e49682dd61c5c3564cff930103))

### Changed

* Feat: Update ResourceLocker interface ([4d440c6](https://github.com/solid/community-server/commit/4d440c6c69dfd1d37d9ad9f955e30df48a35bcef))
* Feat: Update WrappedExpiringResourceLocker to new interface ([b59357e](https://github.com/solid/community-server/commit/b59357ec30b01f05cb948a64b425def893e442d8))
* Fix: Remove locking from the SparqlUpdatePatchHandler ([077f5d7](https://github.com/solid/community-server/commit/077f5d7069ff94108b56d4ebbfc5881a8280955c))
* Feat: Update LockingResourceStore to use new locking interface ([c174025](https://github.com/solid/community-server/commit/c17402517e144444f9b1048ff83d47ee9815d90e))

### Fixed

* Fix: Only require append permissions on POST requests ([93e53b3](https://github.com/solid/community-server/commit/93e53b3d24f6071f8ec98a916ca6d8aa0ae80e97))

## [0.6.0](https://github.com/solid/community-server/compare/v0.5.0...v0.6.0) (2021-01-21)

### Added

* Feat: Export UnsecureConstantCredentialsExtractor. ([5429014](https://github.com/solid/community-server/commit/542901488fb043d47575206f87d0106f656e0974))
* Feat: Add IfNeededConverter and PassthroughConverter. ([6763500](https://github.com/solid/community-server/commit/676350046631b75b136ad01ccca0ce6a64104526))
* Feat: Support composite PATCH updates ([36761e8](https://github.com/solid/community-server/commit/36761e81249c9d7e787083de08135f1f22b5c23d))
* Add optional path and url suffixes to FixedContentTypeMapper ([4ac0167]([4ac0167](https://github.com/solid/community-server/commit/4ac0167c8d2b25a5bc5169617f04f2f9f3eece88))
* Feat: Implement UnsupportedAsyncHandler. ([dd9d873](https://github.com/solid/community-server/commit/dd9d8731226d22e24643ee8565f4369480bae260))
* Feat: Add ConstantConverter. ([5416d66](https://github.com/solid/community-server/commit/5416d66a31f4388c99352a3def81a4d06b085e78))
* Feat: Set Vary header. ([693d48b](https://github.com/solid/community-server/commit/693d48b9eb965c4a479e137eea157eb1943b40a9))
* Feat: Add StaticAssetHandler. ([5a12315](https://github.com/solid/community-server/commit/5a123155541c9e9b1d08c8ad0be52d4dc4e2eabf))
* Feat: Add placeholders for static assets to configuration. ([75d0d41](https://github.com/solid/community-server/commit/75d0d4152af004a6363f5c097ed2e70a230bbc93))

### Changed

* Refactor: Rename BasicTargetExtractor to OriginalUrlExtractor. ([3a4ec48](https://github.com/solid/community-server/commit/3a4ec487208ef9b85e8b5bfb700ebbff82d6984a))

### Fixed

* Fix: Accept absolute paths in CliRunner ([cf6270d](https://github.com/solid/community-server/commit/cf6270d161b2a77eb5f8237974055d33a841042d))

## [0.4.1](https://github.com/solid/community-server/compare/v0.4.0...v0.4.1) (2021-01-13)

### Added

* Feat: Only convert when needed. ([2efebf9](https://github.com/solid/community-server/commit/2efebf91fc0f18bda0369a8ef5fdbfa2542ae10f))
* Feat: Add BaseResourceStore. ([998296a](https://github.com/solid/community-server/commit/998296a4bbb96711d5e533e5398a3988c7461d42))
* Fix: Update acl authorizer to make write rights imply append rights ([61aa2e1](https://github.com/solid/community-server/commit/61aa2e12bddf3fd2be8f6265750d26c09e5e24a9))
* Feat: Add transformSafely. ([995a2dc](https://github.com/solid/community-server/commit/995a2dc74d552fc13311d284affd5407fce9a4c2))
* Refactor: Make request related handle calls consistent ([f17054c](https://github.com/solid/community-server/commit/f17054c64756b74567d0f6e3c05f154fffa449b2))
* Feat: Store target identifier when parsing metadata ([76def28](https://github.com/solid/community-server/commit/76def28a684f3068b5bbb6e52a5a9a209bd42df6))
* Fix: Use base IRI when parsing SPARQL update queries ([775aaa7](https://github.com/solid/community-server/commit/775aaa79cd92f63e7ed31244d50c9c2e1666b700))
* Feat: Add Content-Type constructor to metadata. ([be1af89](https://github.com/solid/community-server/commit/be1af89b56dbdc339932d09f77ef6426a56a5fe2))
* Feat: Add BasicRepresentation. ([66e6368](https://github.com/solid/community-server/commit/66e636878f30e67980a35683d379bed25ed9bfc5))
* Feat: Use ldp: prefix in container representations. ([ba42861](https://github.com/solid/community-server/commit/ba42861699d9c7e6d787c099e0f9ab5eabdfbe7f))

### Fixed

* Fix: Prevent POST BasicRequestParserests from creating intermediate containers ([a5bc8d2](https://github.com/solid/community-server/commit/a5bc8d22a9ce028a8bd8b17ca3658832d4f35ec9))
* Fix: Don't get normalized metadata for root containers ([5995057](https://github.com/solid/community-server/commit/5995057240670ff0227bebe991f76520baf83353))
* Fix: Take baseIRI into account when calling parseQuads ([fea726a](https://github.com/solid/community-server/commit/fea726ae7db9addbfa138452ad171ed0f6a60cd9))
* Test: Move diamond identifier test to ldp handler tests ([d3c8069](https://github.com/solid/community-server/commit/d3c8069aa37a6e3f9d6859b4e5bbae030eeef013))
* Fix: Generalize typing on pushQuad. ([27a1150](https://github.com/solid/community-server/commit/27a115022bd8f5a3e45d78f7dd262ef9929ba365))
* Fix: Allow Content-Type: 0 on GET. ([16ef86a](https://github.com/solid/community-server/commit/16ef86acef515342903a0c3ab668f40223892e77))
* Fix: Always keep guarded error listener attached ([27cc1ec](https://github.com/solid/community-server/commit/27cc1ec15ee01cddc25d57b1e1f8a7537666927c))

## [0.4.0](https://github.com/solid/community-server/compare/v0.3.0...v0.4.0) (2021-01-06)

### Added

* Feat: Create new resources when patching ([7011b76](https://github.com/solid/community-server/commit/7011b766b4d6a39a4edcfde19856d9a4b933fda6))
* Feat: Add read-only store. ([038d572](https://github.com/solid/community-server/commit/038d5728e306248057c3a8d3782050328de618e8))
* Feat: Create ContainerManager for containing container conventions ([9c080c2](https://github.com/solid/community-server/commit/9c080c2101876e2a0008194cba5416fa4fe0ce15))
* Feat: Add constant WebID extractor. ([209b87a](https://github.com/solid/community-server/commit/209b87a424469bb63cbdccd9e89620c330a4e86a))
* Feat: Initialize root containers with RootContainerInitializer ([231349b](https://github.com/solid/community-server/commit/231349b30d1de5fd97ac14540ede945f1d4d9295))
* Feat: ExtensionBasedMapper no longer throws if there is no file ([d7434df](https://github.com/solid/community-server/commit/d7434df8089cdd5c5f040f774710c62331f86ad9))
* Feat: Support .meta files for pod provisioning ([e722cc6](https://github.com/solid/community-server/commit/e722cc67affbb189b48bfb4d133e5bc28bec5339))
* Feat: Add pod template to indicate storage ([70cc359](https://github.com/solid/community-server/commit/70cc3596dbde6e1da1951367b4786052ab2b11d9))
* Feat: Add RecordObject. ([147f3cf](https://github.com/solid/community-server/commit/147f3cf0c7486506ff07cd1211a1ab88c85e7ee8))
* Feat: Bearer token support ([bdfd7cf](https://github.com/solid/community-server/commit/bdfd7cf902afb0cab45b26c62cb0bae18fbcc1ee))
* Feat: Add extra logging for root container creation. ([5a3a612](https://github.com/solid/community-server/commit/5a3a612dce8b183018e15921877cb7fdaaa7c441))
* Feat: Add mainModulePath and globalModules CLI flags. ([ba4f7ff](https://github.com/solid/community-server/commit/ba4f7ff26c77636f7b367de316409001cd173692))
* Feat: Improve path logging. ([e20510a](https://github.com/solid/community-server/commit/e20510a3920cd6d0e7129121dc3cea9ccbbf89df))
* Feat: Expose UriConstants. ([0bd48f0](https://github.com/solid/community-server/commit/0bd48f0dc5655be8022facae8f2405de517c388d))
* Feat: Expose ConversionUtil. ([dfc1d46](https://github.com/solid/community-server/commit/dfc1d4662f4c5fa74e0ee121e890e916dd63d70e))
* Feat: Expose ContentTypes. ([4df11c1](https://github.com/solid/community-server/commit/4df11c193230f65c69919fa2731a737d05a372cb))
* Feat: Expose GuardedStream. ([166c4de](https://github.com/solid/community-server/commit/166c4de493d6f68da9197fe727901d24d4d86eaa))
* Feat: Support strings in addQuad. ([feaac1c](https://github.com/solid/community-server/commit/feaac1cf56eea1b739bb8042cf9bf3ba336f8710))
* Feat: Expose UriUtil. ([882c0fd](https://github.com/solid/community-server/commit/882c0fdba55dfb8d5ba3921c7e4a15bb116b933d))
* Feat: Incorporate server-side representation quality. ([8cd3f7d](https://github.com/solid/community-server/commit/8cd3f7d2e5266a1fb376aba8cb852cbe09d9bc6c))
* Feat: Validate Accept-DateTime. ([ba5c620](https://github.com/solid/community-server/commit/ba5c62059a65c49dbf25e3d54a37c25bcb7045ca))
* Feat: Allow querying metadata. ([3b63786](https://github.com/solid/community-server/commit/3b63786ae09c43d486126c0d52bbfec34eb74e4f))
* Feat: Support writer prefixes. ([87752dd](https://github.com/solid/community-server/commit/87752ddf205a00f81b8597a3f5a3e9ea2aac057f))

### Changed

* Refactor: Split off AclInitializer. ([8fbb4f5](https://github.com/solid/community-server/commit/8fbb4f592e6873afca1ae7e1aa7062588630fcf9))
* Refactor: Split off LoggerInitializer. ([b0ecf1c](https://github.com/solid/community-server/commit/b0ecf1c1d8bb07ccbc25724f0f7ee6b8c948d2fd))
* Refactor: Split off ServerInitializer. ([04a9185](https://github.com/solid/community-server/commit/04a91858c2ebbbe640f5f1b6ab8f1f55ddbb26ef))
* Refactor: Remove Setup. ([badbe00](https://github.com/solid/community-server/commit/badbe0032b7b3a2bfab6df55eb181c619d176b55))
* Change: Refactor AllVoidCompositeHandler into SequenceHandler. ([ba47ce7](https://github.com/solid/community-server/commit/ba47ce79519e950b6a2d5f210ce266796052131a))
* Change: Rename FirstCompositeHandler into WaterfallHandler. ([f26178b](https://github.com/solid/community-server/commit/f26178b1b509e9f58edba7762a3153b1aab5f1cc))
* Change: Make RepresentationMetadata accept a ResourceIdentifier. ([accfc2e](https://github.com/solid/community-server/commit/accfc2e58da9cd2298182e08186a2eced5c877fa))
* Refactor: Replace getParentContainer util function with ContainerManager ([f0db9e5](https://github.com/solid/community-server/commit/f0db9e501f45c265855071e6dc3be77d28e98c80))
* Refactor: Also create named nodes for vocabularies. ([ae06e99](https://github.com/solid/community-server/commit/ae06e9906793831c3730eb33feda52ee75c2ce1e))
* Refactor: Rename UriUtil into TermUtil. ([2e18855](https://github.com/solid/community-server/commit/2e188551f7d53191e8d591ffb6da58fefbe29287))
* Refactor: Use record for representation preference. ([4828912](https://github.com/solid/community-server/commit/48289125932617bda0e4939b20c0d768d745e360))
* Refactor: Rename RepresentationPreference into ValuePreferences. ([09ae959](https://github.com/solid/community-server/commit/09ae95933359ea5d5cd59f711b0f467123255ec0))

### Fixed

* Fix: Only set content-type for documents in sparql store ([d7e189c](https://github.com/solid/community-server/commit/d7e189cdd874253ee058c7fc6cd2b4fac878e136))
* Fix: Allow quad data for containers ([d5bf4e1](https://github.com/solid/community-server/commit/d5bf4e1e675ce63e6a92a8db5c34209e07283231))
* Fix: Do not write error if response already started. ([907caa1](https://github.com/solid/community-server/commit/907caa1e93c1b66df0b76389e1fc7b3cfdc4d3e4))
* Fix: Allow overwriting and deleting root container in SparqlDataAccessor ([fc8540f](https://github.com/solid/community-server/commit/fc8540f5531fd44f6472bfdd0b75633a00ec4e31))
* Fix: Allow deletion of root in InMemoryDataAccessor ([3e3dd7f](https://github.com/solid/community-server/commit/3e3dd7f5a9510fb1e536ae7d0edcc6eab1361bac))
* Fix: Allow DataAccessorBasedStore to create root ([a08b7e9](https://github.com/solid/community-server/commit/a08b7e9112c2188ef62b8a77f7ad09073f126884))
* Fix: Remove metadata content-type assumption from FileDataAccessor ([1464288](https://github.com/solid/community-server/commit/1464288b0f09faccdd4e495640c79b22cb91bfe8))
* Fix: Remove metadata content-type assumption from QuadUtil ([a114d00](https://github.com/solid/community-server/commit/a114d00827e4fe15bf8df9291a0754a7311e1669))
* Fix: Only check relevant type triples ([a721684](https://github.com/solid/community-server/commit/a721684e6b5f67b921e81caa8502da9dde401889))
* Fix: Execute only one main handler. ([2443f2c](https://github.com/solid/community-server/commit/2443f2c75574c7ce44195ae3b5192841d97bea3b))
* Fix: Prevent deletion of root storage containers ([39a79db](https://github.com/solid/community-server/commit/39a79dbcb2986ee0f8ac2106aa7f1e2dd2234d1d))
* Fix: Remove faulty no-routing configuration. ([eb6ba03](https://github.com/solid/community-server/commit/eb6ba0374f341957dee36d74847efbacfa11ef8d))
* Fix: Expose Location header via CORS. ([a5c372c](https://github.com/solid/community-server/commit/a5c372c37c269904e1e6cad5d53d2a3a543779a2))
* Fix: Export all errors. ([f7825be](https://github.com/solid/community-server/commit/f7825beea9961eaa8a0c589f46518d79b0e45142))
* Fix: Distinguish instantiation and initialization errors. ([49551eb](https://github.com/solid/community-server/commit/49551eb9ebcb2a856f1e8c06d6a1abeab7ea72e1))
* Fix: Ensure root file path is absolute. ([c41c41d](https://github.com/solid/community-server/commit/c41c41d0e98437597e26572765e9807eabdb3b4c))
* Fix: Emit all guarded errors to all listeners. ([4faf916](https://github.com/solid/community-server/commit/4faf916ecec7f3fc8c0a50aaebb07c05b5011563))
* Fix: Sort preferences by descending weight. ([98bf8c1](https://github.com/solid/community-server/commit/98bf8c199d8aba8cea488e82351434d06714687b))
* Fix: Allow credentials over CORS. ([ee072b0](https://github.com/solid/community-server/commit/ee072b038afc7b75c33ef64e6312d4101c4fca3d))
* Fix: Join and normalize paths consistently. ([f454b78](https://github.com/solid/community-server/commit/f454b781ff7c466cdf995e8833d481409338deec))
* Fix: Prefer Turtle as default content type. ([e70e060](https://github.com/solid/community-server/commit/e70e060225815d2103fd115e936b0263bc566f05))

## [0.3.0](https://github.com/solid/community-server/compare/v0.2.0...v0.3.0) (2020-12-03)

### Added

* Feat: Store status, body and metadata in ResponseDescription ([1260c5c](https://github.com/solid/community-server/commit/1260c5c14e26e70dc1dafa211ab35c7981c4bd22))
* Feat: Create MetadataSerializer ([aebccd4](https://github.com/solid/community-server/commit/aebccd45c029a0367171748702cb54c5323e683d))
* Feat: Reject unacceptable content types ([69ed2e0](https://github.com/solid/community-server/commit/69ed2e069fcf02515de2c0a8cbd353d7ad7f1fa7))
* Feat: Make internal/quads unacceptable output ([715ba12](https://github.com/solid/community-server/commit/715ba126f9b5ddbec058c4e8c455cdc7fd929639))
* Feat: Implement ExpiringLock and -ResourceLocker ([9fd8440](https://github.com/solid/community-server/commit/9fd844052572c9a7c3e041c5e1a225703a0e5fe9))
* Feat: Add a monitoring store. ([4ef4d44](https://github.com/solid/community-server/commit/4ef4d44a3a26c6d988a7dc284e99e8d2c7c2c98d))
* Feat: Add WebSocket functionality to server. ([5948741](https://github.com/solid/community-server/commit/59487410b1af5dc63904f5e1ad4648a2d3c16f38))
* Feat: Implement the Solid WebSocket protocol. ([0099d1d](https://github.com/solid/community-server/commit/0099d1d5dc8c5f09b06cbdc9e750778122ddfcb2))
* Feat: Include parent containers in POST and DELETE changes. ([d879936](https://github.com/solid/community-server/commit/d8799368fdf68d7370391dd3f75fa0945184701a))
* Feat: Advertise WebSocket via Updates-Via header. ([f08617b](https://github.com/solid/community-server/commit/f08617b1c9f9f908573ecdbc03299833428a1b2b))
* Feat: Create function to wrap streams to not lose errors ([1a30b51](https://github.com/solid/community-server/commit/1a30b514610fb9cf351cb42fbd0fefc87948920d))
* Feat: Export WebSocket classes. ([4a7ea4a](https://github.com/solid/community-server/commit/4a7ea4ad4692e1a407c4d0a987726d8c142a379f))
* Feat: Wire up WebSockets. ([9b70068](https://github.com/solid/community-server/commit/9b7006872243ed0742bee16582a5da7c6bbcdf59))
* Feat: Add DPoPWebIdExtractor. ([0407a36](https://github.com/solid/community-server/commit/0407a3649077d14c85b74a476146e9d7c73d1996))
* Feat: Add patch logging. ([de07906](https://github.com/solid/community-server/commit/de079062be3b9daf58b6e9d5589134cb031e0008))
* Feat: Make HeaderHandler customizable. ([d6c0f89](https://github.com/solid/community-server/commit/d6c0f89cf5c7ac2d0e3fdcd32a04d133f6cbb350))
* Feat: Make CorsHandler customizable. ([8dec921](https://github.com/solid/community-server/commit/8dec921c10363d74ad1c0655b46824d74484be8f))
* Feat: Expose Updates-Via header via CORS. ([49d37dc](https://github.com/solid/community-server/commit/49d37dcd6ce3443df3b7efc65fb4d50dd7095c91))
* Feat: Implement --baseUrl flag. ([eabe6bc](https://github.com/solid/community-server/commit/eabe6bc4ed7966677f62943597a88106d67684cd))
* Feat: Add LDP request logging. ([535cbcd](https://github.com/solid/community-server/commit/535cbcd93a0cd91641a0641d028edf3027c93f09))
* Feat: Support the Forwarded header. ([ecfe3cf](https://github.com/solid/community-server/commit/ecfe3cfc46b41d5b7b89a9f541bac32bc99b15fb))
* Feat: create PodHttpHandler with default interfaces ([39745cc](https://github.com/solid/community-server/commit/39745ccf22a8c41751eacbec07318580ef8009cc))
* Feat: add implementations of pod-related interfaces ([9653dee](https://github.com/solid/community-server/commit/9653deec7ff5885950239c318d447d75c99e611a))
* Feat: add template based data generator ([f387b36](https://github.com/solid/community-server/commit/f387b36dc2b318fbcb92b01648da3d02e1d87b3e))
* Feat: integrate pod creation ([1a043ac](https://github.com/solid/community-server/commit/1a043aca3f1ca828ee1cb28b97b510ccd15bb965))

### Changed

* Refactor: Create multiple composite handlers ([840965c](https://github.com/solid/community-server/commit/840965cdef1959ede73874316fce78f59e545c2c))
* Refactor: Make piping consistent ([95ab0b4](https://github.com/solid/community-server/commit/95ab0b4e760107a06a641b86faac7b385a8b1440))
* Refactor: Remove identifier parameter ([acebf03](https://github.com/solid/community-server/commit/acebf030c7094fa69828e1e170424f442ab24656))
* Refactor: Clean up utility functions ([1073c2f](https://github.com/solid/community-server/commit/1073c2ff4c9e18d716e96e795eb94a7f160c551d))
* Refactor: Add isContainerPath function ([75e4f73](https://github.com/solid/community-server/commit/75e4f73c3f3aa08bea97042078272ab5713d3b5e))
* Refactor: Add ExpressHttpServerFactory. ([e39e796](https://github.com/solid/community-server/commit/e39e7963eb1f0cc0fb0e5ff6ce2fdc3d8573a8b9))
* Refactor: move ExtensionBasedMapper into mapping directory ([2c46d70](https://github.com/solid/community-server/commit/2c46d70780d1af4736156f2b480e8208d2c1b3f4))
* Refactor: abstract parts of ExtensionBasedMapper into MapperUtil ([971e417](https://github.com/solid/community-server/commit/971e4178d1424292d4371afceb5ea013348336d8))
* Change: use isContainerIdentifier in FixedContentTypeMapper ([f23073b](https://github.com/solid/community-server/commit/f23073b87f16ca9d85745fdae1d92f986bf6cac5))
* Refactor: Move lock stuff in its own folder ([dacfb74](https://github.com/solid/community-server/commit/dacfb74a6a0cd07c35923fb513cdb299a67451b6))
* Change: Drop Node 10 support. ([03ffaae](https://github.com/solid/community-server/commit/03ffaaed43fb16648dacd1ba4230b02a47b701f4))
* Change: Make credential extractors specialized. ([b0c50b8](https://github.com/solid/community-server/commit/b0c50b8a7ba3443d8128fcd9967a6086993ebde2))
* Change: Do not warn in canHandle. ([baf6888](https://github.com/solid/community-server/commit/baf68889f98b48c25924aae9ddc0275e88796399))
* Change: Increase logging level of lock expiry. ([1d08f46](https://github.com/solid/community-server/commit/1d08f463f692ac4f44c781d101176aa4ec36ac2e))
* Refactor: Separate middleware from Express. ([023ff80](https://github.com/solid/community-server/commit/023ff80f48d551b8bf3eaa50524772889e5f4d7b))
* Change: Move WebSocketAdvertiser to middleware. ([fc3942b](https://github.com/solid/community-server/commit/fc3942b372f1b227b2c326661bdc2a036cc1eb20))
* Refactor: Refactor runCli to take optional arguments. ([528688b](https://github.com/solid/community-server/commit/528688bc4c3fd48f6e42586ff3da28822197fda9))

### Fixed

* Fix: Integrate wrapStreamError to prevent uncaught errors ([e418333](https://github.com/solid/community-server/commit/e4183333fd523615d24e4d2832224bdd7c45a3d6))
* Fix: Correctly handle acl behaviour for acl identifiers ([ee31291](https://github.com/solid/community-server/commit/ee312910d7f6bc08bd3176168fd6876ffc3d0146))
* Fix: Update quad converter config parameters ([59f99e1](https://github.com/solid/community-server/commit/59f99e1728e47e691315995ebb6dc06df99264b5))
* Fix: Rename UnsupportedHttpError into BadRequestError. ([af8f197](https://github.com/solid/community-server/commit/af8f1976cdf083c4dd5da33a146fa4b613bce815))
* Fix: Always release lock when patching ([3362eee](https://github.com/solid/community-server/commit/3362eee2c2a6215afc05d4f5b072e7b23be642ab))
* Fix: Create container data before adding content-type ([c2b1891](https://github.com/solid/community-server/commit/c2b189184be8390e2335e60e64bbdab0cfee0863))
* Fix: Do not generate empty INSERT graph. ([0ecbffa](https://github.com/solid/community-server/commit/0ecbffa8858b7d3992bea09b175cccf91a1942c5))
* Fix: Do not overwrite existing root ACL. ([77db5c0](https://github.com/solid/community-server/commit/77db5c0060b28477929eac3c7a5887a19286b790))

## [0.2.0](https://github.com/solid/community-server/compare/v0.1.1...v0.2.0) (2020-11-05)

### Added

* Feat: Expose types ([1dd1469](https://github.com/solid/community-server/commit/1dd14692feed21410557548d877c99ac08c2090f))
* Feat: Implement resource mapper for the file resource store (#142) ([383da24](https://github.com/solid/community-server/commit/383da24601118d13e32c41b044ed7e69b31cc113))
* Feat: More integration tests and test configs (#154) ([b1991cb](https://github.com/solid/community-server/commit/b1991cb08ae722aae497104067a7a455456952c7))
* Feat: Update RepresentationMetadata to store triples ([76319ba](https://github.com/solid/community-server/commit/76319ba360f563122f1d35854b0e846417da2490))
* Feat: Add logging ([99464d9](https://github.com/solid/community-server/commit/99464d9a954569cc1f259b01d28e223550571d7a))
* Feat: Implement HEAD request support ([0644f8d](https://github.com/solid/community-server/commit/0644f8d24517b88018f85941d5b74b94c3a443f3))
* Feat: Have ExtensionBasedMapper handle extensions correctly ([b47dc3f](https://github.com/solid/community-server/commit/b47dc3f7f6038cd48a4964a52d9f1b34e52c0562))
* Feat: Decode URI in target extractor ([bb28af9](https://github.com/solid/community-server/commit/bb28af937b4f22cb1d46936ab4668d4c76516cbd))
* Feat: Create MetadataHandler ([7dcb3ea](https://github.com/solid/community-server/commit/7dcb3eaa84058694cf98d642d446d1a2220069b0))
* Feat: Integrate MetadataHandler ([31844a4](https://github.com/solid/community-server/commit/31844a4f40c5e4fc96936c87defa1e1cef3072df))
* Feat: Add support for mocking fs ([e00cb05](https://github.com/solid/community-server/commit/e00cb05dc3d60a9bbeb774e569adfac09fedb831))
* Feat: Create DataAccessorBasedStore to have a standard store implementation ([6ad4076](https://github.com/solid/community-server/commit/6ad40763f9f52ad470e269fe9989eecb7f7209ac))
* Feat: Create file-based DataAccessor ([9a857b7](https://github.com/solid/community-server/commit/9a857b7581c59c46078c3ea56bb0c4aa4f134f9a))
* Feat: Add DataAccessorBasedStore integration ([9b26bbe](https://github.com/solid/community-server/commit/9b26bbef2d2c26402bf01fbe04f85b08a8ec8be9))
* Feat: Create InMemoryDataAccessor ([b896004](https://github.com/solid/community-server/commit/b896004bac421a3999eeb2db529025333ec03002))
* Feat: Fully support storing content-type in file extensions ([e861b08](https://github.com/solid/community-server/commit/e861b080c22cb52ad0eab522ac639560e228b6a8))
* Feat: Implement SPARQL-based ResourceStore ([6cc7053](https://github.com/solid/community-server/commit/6cc705331098a6a182dfae1dbc6bd1f139b913c4))
* Feat: Support SPARQL store backends ([9f7c246](https://github.com/solid/community-server/commit/9f7c2461044f37c55293cc4a2fe38e7a29236cd6))
* Feat: Update RepresentationConvertingStore to convert incoming data ([712a690](https://github.com/solid/community-server/commit/712a690904e544ebfaea21acdcf7d25256c7c07f))
* Feat: Implement a first draft of the RoutingResourceStore ([86de805](https://github.com/solid/community-server/commit/86de805daae7637c148e2b420f0de059ff400c8c))
* Feat: Create a RoutingResourceStore that takes routing rules ([5287cd1](https://github.com/solid/community-server/commit/5287cd1e41f3e0bac2ff8994176611bb10aad29d))
* Feat: Create multiple configs supporting different store backends ([892b5f5](https://github.com/solid/community-server/commit/892b5f5921565a45e32a48b0b8b50b914779a38f))
* Feat: Create routing configs and partially clean up config structure ([f8542a2](https://github.com/solid/community-server/commit/f8542a2c0c0bbda69a7913d6d3076618ab075a10))

### Changed

* Refactor: Rename BasePermissionsExtractor to MethodPermissionsExtractor ([ba8b357](https://github.com/solid/community-server/commit/ba8b3575b0ac70e58768a17ac77a5e74193b5924))
* Refactor: Simplify MethodPermissionsExtractor ([389fb33](https://github.com/solid/community-server/commit/389fb333345b4331bc4ae29cc1cd369a7187210d))
* Refactor: More precise error messages ([063437e](https://github.com/solid/community-server/commit/063437e5c1b83a36978469bcb9fbc818fe627dcf))
* Refactor: Make PassthroughStore generic ([3d95078](https://github.com/solid/community-server/commit/3d9507879beb77a8acb0144d472e63b875adea9b))
* Chore: update to componentsjs-generator with generics support ([e9983d5](https://github.com/solid/community-server/commit/e9983d5837d579c6da0696c3ad6c58a661d4ec33))
* Refactor: Remove RuntimeConfig in favor of config variables, Closes #106 ([1dd140a](https://github.com/solid/community-server/commit/1dd140ab61845ae8df67c16883136736146549dd))
* Refactor: Streamline RepresentationMetadata interface ([8d39793](https://github.com/solid/community-server/commit/8d3979372b44b9367129c28cbffaad120691e675))
* Refactor: Make URI constants consistent ([85df2e5](https://github.com/solid/community-server/commit/85df2e5d7f990b1108cc4da1a63dd18b5f739d87))
* Refactor: Fix typo ([c150da3](https://github.com/solid/community-server/commit/c150da337eee1419783e4bfc2960c48553fd5e2e))
* Refactor: Update eslint related dependencies ([9657fba](https://github.com/solid/community-server/commit/9657fbafb1cf30b23b4da5237e553fe7a82bddee))
* Refactor: Apply naming-convention rules ([e349e04](https://github.com/solid/community-server/commit/e349e041195fc982e80bc82ddb6ab2aa1c1293e0))
* Refactor: Rename UriUtil functions ([e1533a0](https://github.com/solid/community-server/commit/e1533a0869071bbeabf0edfdfd05ccf57883cdaa))
* Refactor: Remove Turtle to Quad and Quad to Turtle converters ([d8e6c08](https://github.com/solid/community-server/commit/d8e6c0885984b5a144117f5128d1f6b1837b2e99))
* Refactor: Move file related metadata to FileResourceStore ([fa935cc](https://github.com/solid/community-server/commit/fa935cc4c7064e3fc4f5866e9febcb43cfd84a10))
* Refactor: Let caller decide which error pipeStreamAndErrors should throw ([006f7ea](https://github.com/solid/community-server/commit/006f7ea7aa986dcf3bb9cfd3329e509cd1ca90eb))
* Refactor: Rename instances of data resource to document ([626b311](https://github.com/solid/community-server/commit/626b3114f413af2eb87c00c880ed86dc7569bb08))
* Refactor: Remove file and in memory stores ([03c64e5](https://github.com/solid/community-server/commit/03c64e561707a4880822338817dc030b97a0f53f))
* Refactor: Make ExtensionBasedMapper only expose what is needed ([4df2645](https://github.com/solid/community-server/commit/4df26454d44a71e676342fc4c5b37fa9e2ee118c))
* Refactor: Implement empty canHandle on base class. (#289) ([1a45b65](https://github.com/solid/community-server/commit/1a45b65df702815a65cc6fb539a6687eea5d3194))
* Chore: Organize tests (#292) ([73a56d8](https://github.com/solid/community-server/commit/73a56d8682711fedd8f54216275e521c44a51670))
* Chore: Use Jest recommended linting. ([4b4f737](https://github.com/solid/community-server/commit/4b4f7370137dbbacf2ef2c887e952ad6d7e55622))
* Refactor: Change constructor so it is supported by Components.js ([dee4eef](https://github.com/solid/community-server/commit/dee4eef131f1852dd62428ff122d73630070d710))
* Refactor: Change routing constructors to work with Components.js ([50dfea1](https://github.com/solid/community-server/commit/50dfea1a27b461ea8ca87526165d33f0d991c44a))
* Refactor: Change PreferenceSupport constructor to work with Components.js ([ef6f01a](https://github.com/solid/community-server/commit/ef6f01a82cc3c17d6b77b824ace707e2602732a0))
* Chore: Add docker npm scripts. ([5f4f4b0](https://github.com/solid/community-server/commit/5f4f4b08b00b8c9004fc266ebdcb5fcab9611e52))
* Chore: Enable/disable Docker testing with a flag. ([fe870f0](https://github.com/solid/community-server/commit/fe870f073a672316eb488964c7525884a7a0eb2d))

### Fixed

* Fix: metadata file error in FileResourceStore ([c808dfe](https://github.com/solid/community-server/commit/c808dfeff09e26a4b31199cc0eec9db8667add28))
* Fix: Retain status codes when combining errors ([10723bb](https://github.com/solid/community-server/commit/10723bb6b866316c2f20da0fe47349bd5f52edf5))
* Fix: Have AsyncHandlers only check what is necessary ([4d34cdd](https://github.com/solid/community-server/commit/4d34cdd12f6dfcc5d5df64bd5c90b13148f69cfb))
* Fix typo. ([79defc3](https://github.com/solid/community-server/commit/79defc3abb77d1454038c8a8e25b79494a9f4a6b))
* Fix: Make sure all URI characters are correctly encoded ([e85ca62](https://github.com/solid/community-server/commit/e85ca622da0c8e3ef8344332e162cfe327f74551))
* Fix: Fix test issues ([2296219](https://github.com/solid/community-server/commit/22962192ffff5eac028ef3604e1cd989331cbff0))
* Fix: Remove metadata file if no new metadata is stored ([63f891c](https://github.com/solid/community-server/commit/63f891c0f17ee915af21805ca114d2a9a90fb62e))
* Fix: Provide full coverage for util functions ([c999abb](https://github.com/solid/community-server/commit/c999abb7b074bd2f0b93c9cfca198324ec9b43ef))
* Fix: Correctly parse URL domain ([5fa0686](https://github.com/solid/community-server/commit/5fa068687b3e99fb388e9c6bf1d3714a3695afaa))
* Fix: Resolve duplicate error message and no trailing newline ([a7fa61a](https://github.com/solid/community-server/commit/a7fa61ab2fc323372b889cab228cec3580e864fb))
* Fix: Write tests and fix related bugs, refactor code ([dff4ba8](https://github.com/solid/community-server/commit/dff4ba8efe2c0613c6184ee0a3ff7dcdb3587840))

## [0.1.1](https://github.com/solid/community-server/compare/v0.1.0...v0.1.1) (2020-09-03)

### Fixed

* Docs: Copyfitting on README ([c3c4424](https://github.com/solid/community-server/commit/c3c4424636620c468824f9374d1da4b1558fd5b2))
* Fix: Move dependencies to production ([80aad8a](https://github.com/solid/community-server/commit/80aad8ab07811ef5070cadfb3b0aabdc6f4214c9))

## [0.1.0](https://github.com/solid/community-server/compare/b949b6cf...v0.1.0) (2020-09-03)

### Added

* Feat: Send server identification ([4965b47](https://github.com/solid/community-server/commit/4965b476c9eb6405932d8e0b51039ac64e983525))
* Feat: Integrate ChainedConverter into the server ([3931d5f](https://github.com/solid/community-server/commit/3931d5f6642c8ce8aaa8116a369ccaa1c0d494f6))
* Feat: Dynamically determine matching types in ChainedConverter ([af4a82f](https://github.com/solid/community-server/commit/af4a82f4c18cdd2b7ff951bec4569e4001994c08))
* Feat: Create RepresentationConverter that chains other converters ([734f7e7](https://github.com/solid/community-server/commit/734f7e7f0f2630c8ce0ba4a6a0a1fd5ccbe50c1f))
* Feat: allow custom config to be passed ([09707a9](https://github.com/solid/community-server/commit/09707a9e6de1161aee3d4a84748f8dcea1cb51ba))
* Feat: Enable dependency injection with auto-generated components ([db04c55](https://github.com/solid/community-server/commit/db04c55196d15f86c6dadce557d9053ba188aed5))
* Feat: add support for parsing more RDF formats using rdf-parse ([e88e680](https://github.com/solid/community-server/commit/e88e680ed7bd2799cdfd6f627dfc85f064dee94c))
* Feat: Support link and slug headers in SimpleBodyParser ([86d5f36](https://github.com/solid/community-server/commit/86d5f367d52b769b563a8ad6ea1a02274f9ec5ab))
* Feat: Move runtime config into dedicated component, Closes #67 ([5126356](https://github.com/solid/community-server/commit/5126356c940bb12d9765bbd3571b6f1f6fa65cd0))
* Feat: Add file based ResourceStore (#52) ([381dae4](https://github.com/solid/community-server/commit/381dae42f689a11937ca4daf0227d0bd16064ce3))
* Feat: Add more extensive permission parsing support ([e06d0bc](https://github.com/solid/community-server/commit/e06d0bc8c5fed72a47bf8e82f0affba27e1f77bb))
* Feat: Integrate acl with rest of server ([769b492](https://github.com/solid/community-server/commit/769b49293cffa77cd7381331bc59e488d7e8f4c9))
* Feat: Add acl support ([0545ca1](https://github.com/solid/community-server/commit/0545ca121eedec5541900aa1411dbeea8af015e2))
* Feat: Integrate data conversion with rest of server ([4403421](https://github.com/solid/community-server/commit/4403421c49e02b851c29e3cb29f248f00f03f639))
* Feat: Convert data from ResourceStore based on preferences ([5e1bb10](https://github.com/solid/community-server/commit/5e1bb10f81dbc81f6d0700a8c108030e5392b36d))
* Feat: Specifiy constants in separate file ([14db5fe](https://github.com/solid/community-server/commit/14db5fed91005bc4f9c92aabbe1675b33b6e28a8))
* Feat: Integrate PATCH functionality ([0e486cf](https://github.com/solid/community-server/commit/0e486cf6a6160b6e14a11ae988673b24b86f7303))
* Feat: Add support for SPARQL updates on ResourceStores ([04a12c7](https://github.com/solid/community-server/commit/04a12c723eefb21b086bdb29e122b4726b1a3e18))
* Feat: Add OperationHandler for PATCH ([482991c](https://github.com/solid/community-server/commit/482991cb9a94bd2b77b7ad64e0fc11edf5db1c50))
* Feat: Add BodyParser for SPARQL updates ([95c65c8](https://github.com/solid/community-server/commit/95c65c86a70b63929ac902e005d809c4621bd759))
* Feat: Add lock functionality ([a9b811a](https://github.com/solid/community-server/commit/a9b811a5a3c14c9774878b0e5a722ae9095c6c92))
* Feat: Add prepare script ([a4dc001](https://github.com/solid/community-server/commit/a4dc00141cc4efaea782701d184a37f3176ecedd))
* Feat: Set up server using express ([a9dc59b](https://github.com/solid/community-server/commit/a9dc59bf78393ad6384599ae2f9a901c4b1b6bc2))
* Feat: Add coveralls support ([7923237](https://github.com/solid/community-server/commit/792323797d4e1d1b97b9fadb32728d6196e7f132))
* Feat: Validate Accept* headers while parsing ([64a3f90](https://github.com/solid/community-server/commit/64a3f908316048f826dd0515c56b670b32a15282))
* Feat: Fully support Accept* headers ([9d9f7df](https://github.com/solid/community-server/commit/9d9f7df5d18b035b036e78ae79019f79b86d9818))
* Feat: add simple response writer ([6180056](https://github.com/solid/community-server/commit/618005675f50e7c78a25e9059d9706afd18ba1fe))
* Feat: add simple operation handlers ([fe87493](https://github.com/solid/community-server/commit/fe8749390cfe528a5b0c3abc5d3aff949dc5ce8a))
* Feat: add simple resource store ([12fd00e](https://github.com/solid/community-server/commit/12fd00e3b8607746fd0304c2372fcb8840e954df))
* Feat: add simple permissions related handlers ([d983fca](https://github.com/solid/community-server/commit/d983fca8f5ae4dcd15adcd03d30303977a72c187))
* Feat: add response description interface ([e0343fc](https://github.com/solid/community-server/commit/e0343fca54d6a779fd94df9863db2b28bb9ba332))
* Feat: add simple request parser ([cf258d0](https://github.com/solid/community-server/commit/cf258d0317feb8988dff97bf39e262a8cdfc1b94))
* Feat: add simple preference parser ([09eb665](https://github.com/solid/community-server/commit/09eb665c12e08afb0673d4748099b120481d3033))
* Feat: add simple target extractor ([3c8a087](https://github.com/solid/community-server/commit/3c8a08761570616fb45af02de1e987a18ce80788))
* Feat: add simple body parser ([d4f70d9](https://github.com/solid/community-server/commit/d4f70d9c59fd5eaa767f7d862b8117365cd28e8e))
* Feat: add request parsing related interfaces ([70af469](https://github.com/solid/community-server/commit/70af46933bc055397ee70ee7f4e1801c95bdd9d7))
* Feat: add typed readable ([e0d74fd](https://github.com/solid/community-server/commit/e0d74fd68af3575f267f8abc87c51a6fbab28d12))
* Feat: Add README with architecture links ([aaf3f8e](https://github.com/solid/community-server/commit/aaf3f8e3aa890219e2a147622605ba2b62b729ee))
* Feat: add AuthenticatedLdpHandler ([3e2cfaf](https://github.com/solid/community-server/commit/3e2cfaf11ee13c2ae3cb3e46f4df78c13c9d19cf))
* Feat: add FirstCompositeHandler to support multiple handlers ([4229932](https://github.com/solid/community-server/commit/4229932a3ac75c2532da4e495e96b779fc5b6c92))
* Feat: add custom errors ([57405f3](https://github.com/solid/community-server/commit/57405f3e2695f3a82628e02052695314d656af95))
* Feat: add additional supported interfaces ([a4f2b39](https://github.com/solid/community-server/commit/a4f2b3995c3e8cfeacf5fe3dbbc0eeb8020f9c9e))
* Initial configuration ([b949b6c](https://github.com/solid/community-server/commit/b949b6cf5eade549b91731edcd1c4d931537a42e))
