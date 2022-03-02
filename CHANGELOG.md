# Changelog
All notable changes to this project will be documented in this file.

<a name="v3.0.0"></a>
## [v3.0.0](https://github.com/solid/community-server/compare/v2.0.1...v3.0.0) - 2022-02-23

### Added
* [feat: Determine Typed Converter output based on input type](https://github.com/solid/community-server/commit/fa94c7d4bb0d67b0cde264f9515260293b3b904a)
* [feat: Add ContentTypeReplacer to conversion chain](https://github.com/solid/community-server/commit/fdd42bb7b3efda8bfac535ef4ff07f45ea4a524a)
* [feat: Add "no conversion" as possible path in ChainedConverter](https://github.com/solid/community-server/commit/d52aa94e535768c183589179462af95814b51094)
* [feat: Support redirection through errors](https://github.com/solid/community-server/commit/7163a0317b80535ba85e636495cb48b61bb6e6f3)
* [feat: Move redirect support from IDP handler to specific handlers](https://github.com/solid/community-server/commit/4241c5348df880646ac39d34d0f733a0743fcb24)
* [feat: Create VoidLocker to disable locking resources](https://github.com/solid/community-server/commit/9a1f324685216bd6346fb19e626dcca5145053df)
* [chore: Build and push official docker image in CI](https://github.com/solid/community-server/commit/65d1eeb0a2f3ab253efca50d98d6a14c3fa3103c)
* [feat: Add support for quota limits](https://github.com/solid/community-server/commit/0cb4d7b16114ce9d0d4c5ae0766b4e4e944af9cf)
* [feat: Add support for N3 Patch](https://github.com/solid/community-server/commit/a9941ebe7880cc9bb136786d721c1ba76bda888a)
* [feat: Allow for custom CLI and variable options](https://github.com/solid/community-server/commit/c216efd62fcc05aa1db5a0046c3dbc512e7f2d62)
* [feat: Send reset password recordId as query parameter](https://github.com/solid/community-server/commit/8f8e8e6df4a4a5d8759c95c2a07e457050830ed6)
* [feat: Split up IDP HTML, routing, and handler behaviour](https://github.com/solid/community-server/commit/bc0eeb1012e15e9e9ee0f9085be209f6a9229ccd)
* [feat: Update IDP templates to work with new API format](https://github.com/solid/community-server/commit/a684b2ead7365b9409d7f2f4cfa6755e8b951958)
* [feat: Simplify setup to be more in line with IDP behaviour](https://github.com/solid/community-server/commit/95777914729890debe0d4815c084029864afaf23)
* [feat: Return client information from consent handler](https://github.com/solid/community-server/commit/e604c0c2e427f7cf426cda6e3a52c2d72b997057)
* [feat: Warn users when they change the base URL](https://github.com/solid/community-server/commit/62e22100238f1b9dfb13b9f350fccf12184f728b)
* [feat: Store the server version on start](https://github.com/solid/community-server/commit/2dc20fe3bc63da1d0a39720410da07f316b253ac)

### Changed
* [refactor: Create BaseTypedRepresentationConverter](https://github.com/solid/community-server/commit/27306d6e3f6f3dda09914e078151a8d07e111869)
* [feat: Update IDP parameters to latest Solid-OIDC version](https://github.com/solid/community-server/commit/fc60b5c161853845d1f3e6405e1182948cca421b)
* [feat: Move OIDC library behaviour to separate path](https://github.com/solid/community-server/commit/520e4fe42fe14ec80ef0718c7f1214620fdae218)
* [fix: Update OIDC provider dependency to v7](https://github.com/solid/community-server/commit/c9ed90aeebaabca957ae1980738f732e5472ee9d)

### Fixed
* [fix: Prefer all inputs equally when generating quads](https://github.com/solid/community-server/commit/c6544fac1db432d1e0ce323bf439c48a7ed5dc52)
* [fix: Handle JSON preferences correctly in dynamic converter](https://github.com/solid/community-server/commit/4d319d2564e953514c94cbadf93e28fefc501e86)
* [fix: Make UnionCredentialsExtractor tolerate failures.](https://github.com/solid/community-server/commit/c13456c2259538e502a59ce73a226bab2c99c395)
* [fix: Accept lowercase Authorization tokens.](https://github.com/solid/community-server/commit/9c52011addde6cbdfd22efeb9485841c640363be)
* [feat: Return correct status codes for invalid requests](https://github.com/solid/community-server/commit/1afed65368f98f4fda7bdd8f9fc5071f51d4dc5b)
* [fix: Split AccountStorage and ForgotPasswordStorage (expiring now)](https://github.com/solid/community-server/commit/d067165b68a824143ff65f289d8a1e5e53d15103)
* [fix: Add content-negotiation when fetching dataset from url](https://github.com/solid/community-server/commit/ce754c119fb87dc8a4f79c639e316bd04d40109b)
* [fix: Prevent login page from showing error before redirect](https://github.com/solid/community-server/commit/1ed45c8903e8750b818885cb6e48183e4c36f22a)
* [fix: Make IDP routes independent of handlers](https://github.com/solid/community-server/commit/1769b799df090a036f2d2925c06ba8d9f7130e6b)
* [fix: Improve OIDC error descriptions](https://github.com/solid/community-server/commit/e9e3c6df3c945e187ae351f15bfe1a6df75e47a9)


<a name="v2.0.1"></a>
## [v2.0.1](https://github.com/solid/community-server/compare/v2.0.0...v2.0.1) - 2021-11-02

### Added
* [feat: Display symlinks in container listings.](https://github.com/solid/community-server/commit/2e4589938f4475a1a776dbc82ca4fd1501360764)

### Fixed
* [fix: Added a content-type parser to HeaderUtil](https://github.com/solid/community-server/commit/54ccbed48dcce890df02d230c64a51d15f5ca6b5)
* [fix: Allow URLs with multiple leading slashes.](https://github.com/solid/community-server/commit/b42150cf52212ff2d6ba76e0db78faf71b10db89)
* [fix: Do not serve UI on special pages.](https://github.com/solid/community-server/commit/8c9887feea7ac27d8acf67f4a0cd52f3e417a483)


<a name="v2.0.0"></a>
## [v2.0.0](https://github.com/solid/community-server/compare/v1.1.0...v2.0.0) - 2021-10-15

### Added
* [feat: Keep track of last modified date of resources](https://github.com/solid/community-server/commit/97c534b2bf3a4b7821397ef46aa0ae724a023bb5)
* [feat: Expose Last-Modified and ETag headers](https://github.com/solid/community-server/commit/77d695c8b6d23b143536eaddd70a8e593926032c)
* [feat: Create conditions based on input headers](https://github.com/solid/community-server/commit/20f783a5811810fa062a61876ebd9bce76a04d75)
* [feat: Verify conditions in DataAccessorBasedStore](https://github.com/solid/community-server/commit/0d42987bbd2d68bfbc81e5270e16870d994f322e)
* [feat: Use RequestParser and ResponseWriter for IDP](https://github.com/solid/community-server/commit/7b7040a1969d10c5dbe30ba70499873941d1f97a)
* [feat: Support content negotiation for IDP requests](https://github.com/solid/community-server/commit/80ebd02cc40773f7971bb24ef7ba071eb37db7f0)
* [feat: Add support for agentGroup ACL rules](https://github.com/solid/community-server/commit/401923b792b6d1dcd51b6645cf414274560fd38d)
* [feat: Support LDN inbox headers](https://github.com/solid/community-server/commit/759112bc04fe3395894dac8a419c59e7d611155d)
* [feat: Convert IDP input data to JSON](https://github.com/solid/community-server/commit/4f1a86dfa0ef91afa44d94494421d79808b43a1c)
* [feat: Support JSON errors](https://github.com/solid/community-server/commit/cc1c3d9223aede72232bb716be20030406179297)
* [feat: Patch containers by recreating Representation from metadata](https://github.com/solid/community-server/commit/ef9703e2846efc6638d08667598b1e7045a8e58b)
* [feat: Create SetupHttpHandler](https://github.com/solid/community-server/commit/4e1a2f5981a3b902dfea40ea4e8a710ce88e9cf6)
* [feat: Integrate setup behaviour](https://github.com/solid/community-server/commit/b592d449ebece81875e37ccc0fe8dfa4a3124a70)
* [feat: Let CredentialsExtractors specify what type of Credentials they generate](https://github.com/solid/community-server/commit/c3fa74de78efbcbd5008f42877cdeed92dfa9f9b)
* [feat: Create UnionHandler to combine AsyncHandler results](https://github.com/solid/community-server/commit/62f026f2bc259125baf28b6c1338e05c3046dafb)
* [feat: Combine the results of multiple CredentialsExtractors](https://github.com/solid/community-server/commit/ba1886ab85d222cc38c78a57b3256b5b4403ae99)
* [feat: Extract set of required modes instead of PermissionSet](https://github.com/solid/community-server/commit/e8dedf5c239f12c36b414c1dd9c6419a31f467de)
* [feat: Use PermissionReaders to determine available permissions](https://github.com/solid/community-server/commit/bf28c83ffab3c9779e28284a313bfdff31e62c2b)
* [feat: Create OperationMetadataCollector to handle operation metadata](https://github.com/solid/community-server/commit/5104cd56e896c654873a68e3f13d1776d93b98fa)
* [feat: Store account settings separately](https://github.com/solid/community-server/commit/6c4ccb334de93d42451f9443afebfc0bc264b95b)
* [feat: Always grant control permissions to pod owners](https://github.com/solid/community-server/commit/8f5d61911d771c623cfb20b0ecded3ea913fc899)
* [feat: Support acl authorization for IDP components](https://github.com/solid/community-server/commit/13c49045d47ef685223941bb926a9d34bace14c8)

### Fixed
* [fix: Explain why logging in will not work](https://github.com/solid/community-server/commit/a062a710bca6148b38050083786eb5ca5dfd5459)
* [fix: Prevent parent containers from storing generated metadata](https://github.com/solid/community-server/commit/7f3eab0b20e6f9a92c8abf642e82cd55440142fe)
* [fix: Make json-ld prefix generation deterministic](https://github.com/solid/community-server/commit/a75d5aa63c55b7481ea4b3aa7cd4b2eb1f8daa5b)
* [fix: Hide internal data by making it auxiliary](https://github.com/solid/community-server/commit/0271133d33b27a0fe5faec8e0a556becdcd15d79)
* [fix: Only check DataAccessor canHandle call for Documents](https://github.com/solid/community-server/commit/a1c3633a25d09633cac46a77b85f05a31b1a28b7)
* [feat: Replace acl specific permissions with generic permissions](https://github.com/solid/community-server/commit/7f8b923399d0b9510ed1aaf4615e49b568ae5ea7)
* [fix: Add required triple to pod README acl](https://github.com/solid/community-server/commit/f40e2c768f54c7c78972c2ea3ffaec8d365a7aa6)
* [fix: Let Representations always have a body](https://github.com/solid/community-server/commit/5613ff9e71a31c1d75589e7bcabfb6209e397902)
* [fix: Return 201 when creating new resources](https://github.com/solid/community-server/commit/76c87bb56ae68e78bedc69a0798a149a187ed472)
* [fix: Return 409 when there is a slash semantics issue](https://github.com/solid/community-server/commit/fb3a59c0541fef61be622a18a79c822192c85420)

### Changed
* [change: Rename resourceStore to aclStore.](https://github.com/solid/community-server/commit/60fc273ea5364e59361aa1542839bc09c3bb3bc3)
* [refactor: Restructure source code folder](https://github.com/solid/community-server/commit/b3da9c9fcfb642e8a8a6d537b2e69cbd74ee8a88)


<a name="v1.1.0"></a>
## [v1.1.0](https://github.com/solid/community-server/compare/v1.0.0...v1.1.0) - 2021-09-03

## Added
* [feat: Throw error when trying to complete interaction out of session](https://github.com/solid/community-server/commit/cb227d6431e8fe891752c7a52d216a0877f9d38e)
* [feat: Indicate to templates if this is part of an auth request](https://github.com/solid/community-server/commit/f71f8683fc0f4e40de2e1c64547397f32c0b6472)
* [feat: Allow filtering in ConstantConverter based on type](https://github.com/solid/community-server/commit/ab06dd30f3f8b0538b693fe50dd3d1f70c035b25)

## Fixed
* [fix: Allow clients to be remembered in the SessionHttpHandler](https://github.com/solid/community-server/commit/47b3a2d77f4a5b3fa5bab364ac19dc32d79a89c1)
* [fix: Convert data to SparqlDataAccessor in regex config](https://github.com/solid/community-server/commit/f34e124e1b88c59b4e456b3f69d9373e61550bd1)
* [fix(deps): update dependency @solid/access-token-verifier to ^0.12.0](https://github.com/solid/community-server/commit/7928f43f443f914c7850a968912f19a78212d266)


<a name="v1.0.0"></a>
## [v1.0.0](https://github.com/solid/community-server/compare/v1.0.0-beta.2...v1.0.0) - 2021-08-04

## Added
* [feat: Create ChainedTemplateEngine for combining engines](https://github.com/solid/community-server/commit/18a71032c0ba872a3acd08fa1c63136fdf6489de)
* [feat: Accept asset paths as config.](https://github.com/solid/community-server/commit/f28279e3a577072adb9ff27b2a54a1624076a448)

## Changed
* [change: Use @css: instead of $PACKAGE_ROOT/](https://github.com/solid/community-server/commit/1719857e4b340fd16cdde9d9a45097072cc68fe2)

## Fixed
* [fix: Replace rimraf with fs-extra.remove](https://github.com/solid/community-server/commit/2a82c4f06e25981205d0841fe473d038888bc3ef)


<a name="v1.0.0-beta.2"></a>
## [v1.0.0-beta.2](https://github.com/solid/community-server/compare/v1.0.0-beta.1...v1.0.0-beta.2) - 2021-07-30

### Added
* [feat: Allow registration to be disabled](https://github.com/solid/community-server/commit/916dce5bd5eb28bfeacfc294cb689614b2386c36)
* [feat: Prevent access to internal storage containers](https://github.com/solid/community-server/commit/7b94b71e7ed087ee065608d300b8bae9989642b7)
* [feat: Cache static assets.](https://github.com/solid/community-server/commit/745eef798a6fe8a0900c99a10c0b04db959f6663)
* [feat: Update ExtensionBasedMapper custom types](https://github.com/solid/community-server/commit/3f8f822d819720f69f8ef362feeaa2b126d3220a)
* [docs: Make registration form self-explanatory.](https://github.com/solid/community-server/commit/969bb0ee6c1706b2541ae2dc520f8a2dff5e9ede)

### Changed
* [refactor: Rename AllowEverythingAuthorizer to AllowAllAuthorizer](https://github.com/solid/community-server/commit/dee382849d742afff20ad2c8c02dba976a7195d8)

### Fixed
* [fix: Trust X-Forwarded headers in the IDP](https://github.com/solid/community-server/commit/2df3f1f28c6e56ef0333bf91e86ad5d60f8396d9)
* [fix: Prevent cyclical dependency with locker and storage](https://github.com/solid/community-server/commit/45f9a51d7cc45d5aa85e2f439d93d2ba06e84159)
* [fix: Use memory key/value storage for sparql backends](https://github.com/solid/community-server/commit/c01e33ecd9b25efa9219cc98519de8042b3ad380)
* [fix: Expose WAC-Allow via CORS.](https://github.com/solid/community-server/commit/02715363139e7fd193e9ffae6bbffa9288948316)
* [fix: Expose Link via CORS.](https://github.com/solid/community-server/commit/643ceced362dc5d002b98ab044b597b7ad11d182)


<a name="v1.0.0-beta.1"></a>
## [v1.0.0-beta.1](https://github.com/solid/community-server/compare/v1.0.0-beta.0...v1.0.0-beta.1) - 2021-07-23

### Added
* [feat: Support metadata in multiple graphs](https://github.com/solid/community-server/commit/35a7cf988c139de0c7bf3f6e821ea4a52e83d2b4)
* [feat: Allow HttpErrors to store cause and errorCode](https://github.com/solid/community-server/commit/e44c337d0f3b7a4090ce9602f954540a5180ca3b)
* [feat: Convert errorCodes using markdown](https://github.com/solid/community-server/commit/f2f967ff8add626aa47a6b2da48071bcde18c12d)
* [feat: Add IndexRepresentationStore to support index resources](https://github.com/solid/community-server/commit/cc1e33239417fe9cd45c07af0e5f03d09c5980a1)
* [feat: Style main template.](https://github.com/solid/community-server/commit/264b9707ace44c3758f2045f0a15db5635073f54)
* [refactor: Match IDP templates to main template.](https://github.com/solid/community-server/commit/6897784a92edc072ef9d0ac29ab5f6bf77d72638)
* [feat: Render Markdown documents as HTML.](https://github.com/solid/community-server/commit/c0dac12111ccbd3fb9473a0c010bda4760d1c84b)
* [feat: Add HTML container listing.](https://github.com/solid/community-server/commit/1394b9cb56c38599ae9cb36af223952be046b5d9)
* [feat: Add support for client_id WebIDs](https://github.com/solid/community-server/commit/3bb7a32c0ca6b672fc9f576e24b7c3c2c299e03d)

### Changed
* [feat: Split ResourceStore config into 2 parts](https://github.com/solid/community-server/commit/ad7f4ed134ea387352806c992713caad6039d0ca)

### Fixed
* [fix: Use #me for WebID generation](https://github.com/solid/community-server/commit/ee456a5c110bf480ddd18351e57067c67c161d7f)
* [fix: Fix incorrect path in https example config](https://github.com/solid/community-server/commit/0c3210fae724870809d462aaa1c5fedf336d8f54)
* [fix: Always find the best path with ChainedConverter](https://github.com/solid/community-server/commit/e7ff134b258f984f241969d4ba18dfe0525d5f6a)
* [fix: Prevent generated metadata from being stored](https://github.com/solid/community-server/commit/12e501844fe925747b5740bd0987b1716deafee9)
* [fix: Throw internal error with invalid ACL.](https://github.com/solid/community-server/commit/e43b579ae7a14a0b7be5c89545922346c7fb3833)
* [fix: Make sure there is always a fallback for error handling](https://github.com/solid/community-server/commit/bd10256e5901320d9736310868bed1d820aba5d1)
* [fix: Remove the cache from the ChainedConverter](https://github.com/solid/community-server/commit/fe8d579c72bb5b146e638647644252f05e4bd353)


<a name="v1.0.0-beta.0"></a>
## [v1.0.0-beta.0](https://github.com/solid/community-server/compare/v0.9.0...v1.0.0-beta.0) - 2021-06-29

### Added
* [feat: Support creation of HTTPS server](https://github.com/solid/community-server/commit/7faad0aef0f0d9d5c106e57c16e17340cb1ba303)
* [feat: Combine pod creation with IDP registration](https://github.com/solid/community-server/commit/4d7d939dc4ab0a4da3eca6e0656cb0325aba06e2)
* [feat: Create ErrorHandler to convert errors to Representations](https://github.com/solid/community-server/commit/e1f95877dac6a8f77d2c7a687bf478440ee5cb17)
* [feat: Add showStackTrace CLI variable](https://github.com/solid/community-server/commit/b604dd8331e1c7682dd6080c696981855e277df6)
* [feat: Create WWW-Authenticate metadata writer](https://github.com/solid/community-server/commit/e3c5b3975266e5eee3939f9d1e8f5e0537417782)
* [Expose constant Allow header](https://github.com/solid/community-server/commit/a6371b073597ae922c3374d952dfdf2f920017ac)
* [feat: Add ErrorToHtmlConverter using templates](https://github.com/solid/community-server/commit/9c0fa775276b8ba3383d25a155a2507309e0a1de)
* [fix: Support BGPs with variables in SPARQL UPDATE queries](https://github.com/solid/community-server/commit/f299b36e2429245bf82be85ca0cccf733d658619)

### Changed
* [refactor: Move config templates to templates folder](https://github.com/solid/community-server/commit/fadbaefce239e2367c0d24727edf1afb14cbf03d)
* [feat: Split preset configurations by feature](https://github.com/solid/community-server/commit/452032e3120d490d7261b9d304c8c393410f0406)
* [feat: Remove /interaction/:uid from IDP URLs](https://github.com/solid/community-server/commit/df33b6dc472490568490ad5de4a011938e9cb205)

### Fixed
* [fix: Support missing type preferences in ChainedConverter](https://github.com/solid/community-server/commit/52a3b84ee0dd55baed0dd244f75c12d06ed77666)
* [fix: Add solid_oidc_supported to openid config](https://github.com/solid/community-server/commit/b328f9a1b06e2bc7994a82d4a7f90712a19c9b88)


<a name="v0.9.0"></a>
## [v0.9.0](https://github.com/solid/community-server/compare/v0.8.1...v0.9.0) - 2021-05-04

### Added
* [feat: Add identity provider (#455)](https://github.com/solid/community-server/commit/1d65143e89d4d64663805467a1587850690eeb59)
* [feat: Add redis based locking mechanism](https://github.com/solid/community-server/commit/99d0173213be4b05bc78b80ac108cbb5f0906ad6)
* [feat: enable more compact config props using type-scoped contexts](https://github.com/solid/community-server/commit/2861b902c476c456b9e5c208ab5048fc6e318421)
* [feat: Update ChainedConverter to create dynamic paths](https://github.com/solid/community-server/commit/44d82eac045fc3a5e8ae4b5407fc1989889f9e27)
* [feat: Expose AppRunner.run for easily serving from JS apps](https://github.com/solid/community-server/commit/d1eadd75e73e79fe3c50034f151c6a4e93844c14)

### Fixed
* [fix: Prevent CliRunner tests from outputting errors](https://github.com/solid/community-server/commit/a00de24ec0ffb213dacd1bc5de09c1e7d0094eeb)
* [fix: Use HttpErrors instead of Errors](https://github.com/solid/community-server/commit/218c8f4662b41f8f4d534d8b54f912664c365769)
* [fix: Prevent HttpRequest from being closed](https://github.com/solid/community-server/commit/953458231b4b7149056cf6fe6887a1eef7a87737)
* [fix: Allow owners to edit their own profile](https://github.com/solid/community-server/commit/7aebab1173c8a66b6f3630c8c8805021dc869367)


<a name="v0.8.1"></a>
## [v0.8.1](https://github.com/solid/community-server/compare/v0.8.0...v0.8.1) - 2021-03-23

### Added
* [feat: Fallback to X-Forwarded-* headers](https://github.com/solid/community-server/commit/de51a231e3b924de1c857b26eb85fb3b5bdef52b)
* [feat: Added oidc validation triples to template](https://github.com/solid/community-server/commit/e2284c4c42e22cd933f77ef0b6d6a4120c902778)

### Fixed
* [fix: Make new pod profile card public](https://github.com/solid/community-server/commit/613dd5698a530bf4bd718850d8945f7300f19e58)
* [fix: Fix issue when there are multiple values for the same CLI parameter](https://github.com/solid/community-server/commit/dd5b496f1d6b7727b034890dff6c8a43bbcd0ddc)


<a name="v0.8.0"></a>
## [v0.8.0](https://github.com/solid/community-server/compare/v0.7.0...v0.8.0) - 2021-03-04

### Added
* [feat: Static favicon asset](https://github.com/solid/community-server/commit/03e631ff178c48aeaafefe63e0027638f6e3b524)
* [feat: Introduce internal storing mechanism](https://github.com/solid/community-server/commit/59deb989eccbb4368a97088d4b6fcb612a988341)
* [feat: Create GreedyReadWriteLocker using read/write locking algorithm](https://github.com/solid/community-server/commit/a3f41c1d431c3e1582cd87971434282a46408d09)
* [feat: Introduce generic auxiliary resource support](https://github.com/solid/community-server/commit/d6cdd7dbdfe09d3ae90279d4eca2cb0b9c7d74f9)
* [feat: Support auxiliary behaviour in DataAccessorBasedStore](https://github.com/solid/community-server/commit/0c047234e32f6c459f2dad2011014cd8195b43fd)
* [feat: Add WAC-Allow header when required](https://github.com/solid/community-server/commit/139342470ee013a66466a79a868b8dbf52e9c969)
* [feat: Emit container pub event on PUT.](https://github.com/solid/community-server/commit/c3cff553e3775842e3a2c9554111cdbbf4467e98)
* [feat: Create SubdomainExtensionBasedMapper](https://github.com/solid/community-server/commit/bdb3621ee33e513bf6b6086e502940433c118946)
* [feat: Added resourceExists method to ResourceStore](https://github.com/solid/community-server/commit/b3f292d71880bf2654aed3da17a5b55173f159ce)
* [feat: Solid community server Docker image](https://github.com/solid/community-server/commit/52551ac773cf0012387b664880756870df4d81bd)
* [feat: Create pod manager for generating dynamic pods](https://github.com/solid/community-server/commit/88d008e36fb573bc7edb29dc565d022be19551e8)
* [feat: Create KeyValueStorage with a JSON file backend](https://github.com/solid/community-server/commit/6288003915bda84401a82de3ad62265485e6503d)
* [fix: Error when unknown parameters are passed to the main executable](https://github.com/solid/community-server/commit/1589def0664fd33a4aeac629d207e97a2b093bd3)

### Changed
* [feat: Replace express with native http module](https://github.com/solid/community-server/commit/ce1f4300ff5444626bbbb1bc7bee8e40d3bb65f7)
* [feat: Make stores return modified resources.](https://github.com/solid/community-server/commit/6edc255707d93cb3b9b7d62323802c6a3ff1a8cb)
* [change: Query string does not influence identifier.](https://github.com/solid/community-server/commit/a57105be8e08f8b39bd827a56fc6cf14d4425419)

### Fixed
* [fix: Do not re-encode static assets. (#566)](https://github.com/solid/community-server/commit/c899e6c4b1ab714347f49006b96615ad54fdb387)
* [fix: Preserve query string in transformations.](https://github.com/solid/community-server/commit/6e50443a3930adb14a483899b87589ccf42e7596)
* [fix: Test error classes correctly](https://github.com/solid/community-server/commit/c29928c32c0d2ce5c97889edb3bd73904ab6077e)
* [fix: Close unpiped streams](https://github.com/solid/community-server/commit/386d78277dc7dda340c284bfff1ef8c40605e7ed)
* [fix: Prevent race condition in OPTIONS call](https://github.com/solid/community-server/commit/73acb9cd52d056526bc4c3812eaaebd54bd11840)
* [fix: Fix problem with piping streams for PATCH requests](https://github.com/solid/community-server/commit/6c4378a2de290d4925f14f642697523ff38aa6e3)
* [fix: Fixed bug with empty Accept headers and internal/quads bodies](https://github.com/solid/community-server/commit/59600b07f88027d0bd4ac641919e990ca8016642)
* [fix: Simply GuardedStream check](https://github.com/solid/community-server/commit/c05933f652857aec6975c7c38418805d0171cb88)
* [fix: Prevent setRepresentation crash if there is no root container](https://github.com/solid/community-server/commit/6424b07fc6212b1069b519732a82553870f28fb0)
* [fix: Remove default root container from InMemoryDataAccessor](https://github.com/solid/community-server/commit/bb6563044190b521d7d06ad3af0e5e3c482907af)
* [test: Remove root folder creation from integration tests](https://github.com/solid/community-server/commit/49a04c4d0a4cf0ff108b201ff0f587e996a45081)
* [fix: Make mkdir recursive in FileDataAccessor](https://github.com/solid/community-server/commit/30cebec32a1b15b0dd57d6072dda78e35026083a)
* [fix: do not output filesystem container size](https://github.com/solid/community-server/commit/1486f01aaf714aba945df5f31f17cb5e96002d1a)
* [Fix #621: acl:AuthenticatedAgent instead of foaf:AuthenticatedAgent](https://github.com/solid/community-server/commit/91791a0a140a9b1c80c2d7d9dde910c90b2062d8)
* [fix: Allow non-variable BGP boedies in SPARQL updates](https://github.com/solid/community-server/commit/894d4589d96533e9432c63911adc355c0785f0e0)
* [Correctly handle slugs in POST requests](https://github.com/solid/community-server/commit/28c0eb7e887f907fc4ca3a5045d9eb71cf0b0491)
* [fix: Update faulty token verifier](https://github.com/solid/community-server/commit/5c6822d4686585a03631b371427c7e2151ab65c7)
* [fix: SPARQL PATCH Content Type](https://github.com/solid/community-server/commit/2a34a430fa7435df01743e7f8ac7de014d259405)
* [fix: SPARQL body parser test content type metadata](https://github.com/solid/community-server/commit/23473f59e69c1e028c7796996d98cf571277ad14)


<a name="v0.7.0"></a>
## [v0.7.0](https://github.com/solid/community-server/compare/v0.6.0...v0.7.0) - 2021-01-28

### Added
* [feat: Update config to include LockingResourceStore](https://github.com/solid/community-server/commit/69c31446ddad03308037d8b7992ea0e220dd2ed2)
* [feat: Add ConstantMetadataWriter.](https://github.com/solid/community-server/commit/fe3957f0aeb8e55da65de4c88a1f5beb7d098b42)
* [feat: Set MS-Author-Via header.](https://github.com/solid/community-server/commit/8c2f737fe0b7ce8bd435290fcee5b2c65823fce4)
* [feat: Set Accept-Patch header.](https://github.com/solid/community-server/commit/153d2d9fe44a8993da94ebc513e7b520f0b7eea8)
* [feat: Add acl link header writer](https://github.com/solid/community-server/commit/2c3300028e0bd182a2296db83dfb74db3daaf219)
* [feat: Add ParallelHandler.](https://github.com/solid/community-server/commit/817cf3ac0d8f2d37cd950c52e5a0f74bd3644e33)
* [feat: Support folders in StaticAssetHandler.](https://github.com/solid/community-server/commit/2563335403c859e49682dd61c5c3564cff930103)

### Changed
* [feat: Update ResourceLocker interface](https://github.com/solid/community-server/commit/4d440c6c69dfd1d37d9ad9f955e30df48a35bcef)
* [feat: Update WrappedExpiringResourceLocker to new interface](https://github.com/solid/community-server/commit/b59357ec30b01f05cb948a64b425def893e442d8)
* [fix: Remove locking from the SparqlUpdatePatchHandler](https://github.com/solid/community-server/commit/077f5d7069ff94108b56d4ebbfc5881a8280955c)
* [feat: Update LockingResourceStore to use new locking interface](https://github.com/solid/community-server/commit/c17402517e144444f9b1048ff83d47ee9815d90e)

### Fixed
* [fix: Only require append permissions on POST requests](https://github.com/solid/community-server/commit/93e53b3d24f6071f8ec98a916ca6d8aa0ae80e97)


<a name="v0.6.0"></a>
## [v0.6.0](https://github.com/solid/community-server/compare/v0.5.0...v0.6.0) - 2021-01-21

### Added
* [feat: Export UnsecureConstantCredentialsExtractor.](https://github.com/solid/community-server/commit/542901488fb043d47575206f87d0106f656e0974)
* [feat: Add IfNeededConverter and PassthroughConverter.](https://github.com/solid/community-server/commit/676350046631b75b136ad01ccca0ce6a64104526)
* [feat: Support composite PATCH updates](https://github.com/solid/community-server/commit/36761e81249c9d7e787083de08135f1f22b5c23d)
* [Add optional path and url suffixes to FixedContentTypeMapper](https://github.com/solid/community-server/commit/4ac0167c8d2b25a5bc5169617f04f2f9f3eece88)
* [feat: Implement UnsupportedAsyncHandler.](https://github.com/solid/community-server/commit/dd9d8731226d22e24643ee8565f4369480bae260)
* [feat: Add ConstantConverter.](https://github.com/solid/community-server/commit/5416d66a31f4388c99352a3def81a4d06b085e78)
* [feat: Set Vary header.](https://github.com/solid/community-server/commit/693d48b9eb965c4a479e137eea157eb1943b40a9)
* [feat: Add StaticAssetHandler.](https://github.com/solid/community-server/commit/5a123155541c9e9b1d08c8ad0be52d4dc4e2eabf)
* [feat: Add placeholders for static assets to configuration.](https://github.com/solid/community-server/commit/75d0d4152af004a6363f5c097ed2e70a230bbc93)

### Changed
* [refactor: Rename BasicTargetExtractor to OriginalUrlExtractor.](https://github.com/solid/community-server/commit/3a4ec487208ef9b85e8b5bfb700ebbff82d6984a)

### Fixed
* [fix: Accept absolute paths in CliRunner](https://github.com/solid/community-server/commit/cf6270d161b2a77eb5f8237974055d33a841042d)


<a name="v0.4.1"></a>
## [v0.4.1](https://github.com/solid/community-server/compare/v0.4.0...v0.4.1) - 2021-01-13

### Added
* [feat: Only convert when needed.](https://github.com/solid/community-server/commit/2efebf91fc0f18bda0369a8ef5fdbfa2542ae10f)
* [feat: Add BaseResourceStore.](https://github.com/solid/community-server/commit/998296a4bbb96711d5e533e5398a3988c7461d42)
* [fix: Update acl authorizer to make write rights imply append rights](https://github.com/solid/community-server/commit/61aa2e12bddf3fd2be8f6265750d26c09e5e24a9)
* [feat: Add transformSafely.](https://github.com/solid/community-server/commit/995a2dc74d552fc13311d284affd5407fce9a4c2)
* [refactor: Make request related handle calls consistent](https://github.com/solid/community-server/commit/f17054c64756b74567d0f6e3c05f154fffa449b2)
* [feat: Store target identifier when parsing metadata](https://github.com/solid/community-server/commit/76def28a684f3068b5bbb6e52a5a9a209bd42df6)
* [fix: Use base IRI when parsing SPARQL update queries](https://github.com/solid/community-server/commit/775aaa79cd92f63e7ed31244d50c9c2e1666b700)
* [feat: Add Content-Type constructor to metadata.](https://github.com/solid/community-server/commit/be1af89b56dbdc339932d09f77ef6426a56a5fe2)
* [feat: Add BasicRepresentation.](https://github.com/solid/community-server/commit/66e636878f30e67980a35683d379bed25ed9bfc5)
* [feat: Use ldp: prefix in container representations.](https://github.com/solid/community-server/commit/ba42861699d9c7e6d787c099e0f9ab5eabdfbe7f)

### Fixed
* [fix: Prevent POST BasicRequestParserests from creating intermediate containers](https://github.com/solid/community-server/commit/a5bc8d22a9ce028a8bd8b17ca3658832d4f35ec9)
* [fix: Don't get normalized metadata for root containers](https://github.com/solid/community-server/commit/5995057240670ff0227bebe991f76520baf83353)
* [fix: Take baseIRI into account when calling parseQuads](https://github.com/solid/community-server/commit/fea726ae7db9addbfa138452ad171ed0f6a60cd9)
* [test: Move diamond identifier test to ldp handler tests](https://github.com/solid/community-server/commit/d3c8069aa37a6e3f9d6859b4e5bbae030eeef013)
* [fix: Generalize typing on pushQuad.](https://github.com/solid/community-server/commit/27a115022bd8f5a3e45d78f7dd262ef9929ba365)
* [fix: Allow Content-Type: 0 on GET.](https://github.com/solid/community-server/commit/16ef86acef515342903a0c3ab668f40223892e77)
* [fix: Always keep guarded error listener attached](https://github.com/solid/community-server/commit/27cc1ec15ee01cddc25d57b1e1f8a7537666927c)


<a name="v0.4.0"></a>
## [v0.4.0](https://github.com/solid/community-server/compare/v0.3.0...v0.4.0) - 2021-01-06

### Added
* [feat: Create new resources when patching](https://github.com/solid/community-server/commit/7011b766b4d6a39a4edcfde19856d9a4b933fda6)
* [feat: Add read-only store.](https://github.com/solid/community-server/commit/038d5728e306248057c3a8d3782050328de618e8)
* [feat: Create ContainerManager for containing container conventions](https://github.com/solid/community-server/commit/9c080c2101876e2a0008194cba5416fa4fe0ce15)
* [feat: Add constant WebID extractor.](https://github.com/solid/community-server/commit/209b87a424469bb63cbdccd9e89620c330a4e86a)
* [feat: Initialize root containers with RootContainerInitializer](https://github.com/solid/community-server/commit/231349b30d1de5fd97ac14540ede945f1d4d9295)
* [feat: ExtensionBasedMapper no longer throws if there is no file](https://github.com/solid/community-server/commit/d7434df8089cdd5c5f040f774710c62331f86ad9)
* [feat: Support .meta files for pod provisioning](https://github.com/solid/community-server/commit/e722cc67affbb189b48bfb4d133e5bc28bec5339)
* [feat: Add pod template to indicate storage](https://github.com/solid/community-server/commit/70cc3596dbde6e1da1951367b4786052ab2b11d9)
* [feat: Add RecordObject.](https://github.com/solid/community-server/commit/147f3cf0c7486506ff07cd1211a1ab88c85e7ee8)
* [feat: Bearer token support](https://github.com/solid/community-server/commit/bdfd7cf902afb0cab45b26c62cb0bae18fbcc1ee)
* [feat: Add extra logging for root container creation.](https://github.com/solid/community-server/commit/5a3a612dce8b183018e15921877cb7fdaaa7c441)
* [feat: Add mainModulePath and globalModules CLI flags.](https://github.com/solid/community-server/commit/ba4f7ff26c77636f7b367de316409001cd173692)
* [feat: Improve path logging.](https://github.com/solid/community-server/commit/e20510a3920cd6d0e7129121dc3cea9ccbbf89df)
* [feat: Expose UriConstants.](https://github.com/solid/community-server/commit/0bd48f0dc5655be8022facae8f2405de517c388d)
* [feat: Expose ConversionUtil.](https://github.com/solid/community-server/commit/dfc1d4662f4c5fa74e0ee121e890e916dd63d70e)
* [feat: Expose ContentTypes.](https://github.com/solid/community-server/commit/4df11c193230f65c69919fa2731a737d05a372cb)
* [feat: Expose GuardedStream.](https://github.com/solid/community-server/commit/166c4de493d6f68da9197fe727901d24d4d86eaa)
* [feat: Support strings in addQuad.](https://github.com/solid/community-server/commit/feaac1cf56eea1b739bb8042cf9bf3ba336f8710)
* [feat: Expose UriUtil.](https://github.com/solid/community-server/commit/882c0fdba55dfb8d5ba3921c7e4a15bb116b933d)
* [feat: Incorporate server-side representation quality.](https://github.com/solid/community-server/commit/8cd3f7d2e5266a1fb376aba8cb852cbe09d9bc6c)
* [feat: Validate Accept-DateTime.](https://github.com/solid/community-server/commit/ba5c62059a65c49dbf25e3d54a37c25bcb7045ca)
* [feat: Allow querying metadata.](https://github.com/solid/community-server/commit/3b63786ae09c43d486126c0d52bbfec34eb74e4f)
* [feat: Support writer prefixes.](https://github.com/solid/community-server/commit/87752ddf205a00f81b8597a3f5a3e9ea2aac057f)

### Changed
* [refactor: Split off AclInitializer.](https://github.com/solid/community-server/commit/8fbb4f592e6873afca1ae7e1aa7062588630fcf9)
* [refactor: Split off LoggerInitializer.](https://github.com/solid/community-server/commit/b0ecf1c1d8bb07ccbc25724f0f7ee6b8c948d2fd)
* [refactor: Split off ServerInitializer.](https://github.com/solid/community-server/commit/04a91858c2ebbbe640f5f1b6ab8f1f55ddbb26ef)
* [refactor: Remove Setup.](https://github.com/solid/community-server/commit/badbe0032b7b3a2bfab6df55eb181c619d176b55)
* [change: Refactor AllVoidCompositeHandler into SequenceHandler.](https://github.com/solid/community-server/commit/ba47ce79519e950b6a2d5f210ce266796052131a)
* [change: Rename FirstCompositeHandler into WaterfallHandler.](https://github.com/solid/community-server/commit/f26178b1b509e9f58edba7762a3153b1aab5f1cc)
* [change: Make RepresentationMetadata accept a ResourceIdentifier.](https://github.com/solid/community-server/commit/accfc2e58da9cd2298182e08186a2eced5c877fa)
* [refactor: Replace getParentContainer util function with ContainerManager](https://github.com/solid/community-server/commit/f0db9e501f45c265855071e6dc3be77d28e98c80)
* [refactor: Also create named nodes for vocabularies.](https://github.com/solid/community-server/commit/ae06e9906793831c3730eb33feda52ee75c2ce1e)
* [refactor: Rename UriUtil into TermUtil.](https://github.com/solid/community-server/commit/2e188551f7d53191e8d591ffb6da58fefbe29287)
* [refactor: Use record for representation preference.](https://github.com/solid/community-server/commit/48289125932617bda0e4939b20c0d768d745e360)
* [refactor: Rename RepresentationPreference into ValuePreferences.](https://github.com/solid/community-server/commit/09ae95933359ea5d5cd59f711b0f467123255ec0)

### Fixed
* [fix: Only set content-type for documents in sparql store](https://github.com/solid/community-server/commit/d7e189cdd874253ee058c7fc6cd2b4fac878e136)
* [fix: Allow quad data for containers](https://github.com/solid/community-server/commit/d5bf4e1e675ce63e6a92a8db5c34209e07283231)
* [fix: Do not write error if response already started.](https://github.com/solid/community-server/commit/907caa1e93c1b66df0b76389e1fc7b3cfdc4d3e4)
* [fix: Allow overwriting and deleting root container in SparqlDataAccessor](https://github.com/solid/community-server/commit/fc8540f5531fd44f6472bfdd0b75633a00ec4e31)
* [fix: Allow deletion of root in InMemoryDataAccessor](https://github.com/solid/community-server/commit/3e3dd7f5a9510fb1e536ae7d0edcc6eab1361bac)
* [fix: Allow DataAccessorBasedStore to create root](https://github.com/solid/community-server/commit/a08b7e9112c2188ef62b8a77f7ad09073f126884)
* [fix: Remove metadata content-type assumption from FileDataAccessor](https://github.com/solid/community-server/commit/1464288b0f09faccdd4e495640c79b22cb91bfe8)
* [fix: Remove metadata content-type assumption from QuadUtil](https://github.com/solid/community-server/commit/a114d00827e4fe15bf8df9291a0754a7311e1669)
* [fix: Only check relevant type triples](https://github.com/solid/community-server/commit/a721684e6b5f67b921e81caa8502da9dde401889)
* [fix: Execute only one main handler.](https://github.com/solid/community-server/commit/2443f2c75574c7ce44195ae3b5192841d97bea3b)
* [fix: Prevent deletion of root storage containers](https://github.com/solid/community-server/commit/39a79dbcb2986ee0f8ac2106aa7f1e2dd2234d1d)
* [fix: Remove faulty no-routing configuration.](https://github.com/solid/community-server/commit/eb6ba0374f341957dee36d74847efbacfa11ef8d)
* [fix: Expose Location header via CORS.](https://github.com/solid/community-server/commit/a5c372c37c269904e1e6cad5d53d2a3a543779a2)
* [fix: Export all errors.](https://github.com/solid/community-server/commit/f7825beea9961eaa8a0c589f46518d79b0e45142)
* [fix: Distinguish instantiation and initialization errors.](https://github.com/solid/community-server/commit/49551eb9ebcb2a856f1e8c06d6a1abeab7ea72e1)
* [fix: Ensure root file path is absolute.](https://github.com/solid/community-server/commit/c41c41d0e98437597e26572765e9807eabdb3b4c)
* [fix: Emit all guarded errors to all listeners.](https://github.com/solid/community-server/commit/4faf916ecec7f3fc8c0a50aaebb07c05b5011563)
* [fix: Sort preferences by descending weight.](https://github.com/solid/community-server/commit/98bf8c199d8aba8cea488e82351434d06714687b)
* [fix: Allow credentials over CORS.](https://github.com/solid/community-server/commit/ee072b038afc7b75c33ef64e6312d4101c4fca3d)
* [fix: Join and normalize paths consistently.](https://github.com/solid/community-server/commit/f454b781ff7c466cdf995e8833d481409338deec)
* [fix: Prefer Turtle as default content type.](https://github.com/solid/community-server/commit/e70e060225815d2103fd115e936b0263bc566f05)


<a name="v0.3.0"></a>
## [v0.3.0](https://github.com/solid/community-server/compare/v0.2.0...v0.3.0) - 2020-12-03

### Added
* [feat: Store status, body and metadata in ResponseDescription](https://github.com/solid/community-server/commit/1260c5c14e26e70dc1dafa211ab35c7981c4bd22)
* [feat: Create MetadataSerializer](https://github.com/solid/community-server/commit/aebccd45c029a0367171748702cb54c5323e683d)
* [feat: Reject unacceptable content types](https://github.com/solid/community-server/commit/69ed2e069fcf02515de2c0a8cbd353d7ad7f1fa7)
* [feat: Make internal/quads unacceptable output](https://github.com/solid/community-server/commit/715ba126f9b5ddbec058c4e8c455cdc7fd929639)
* [feat: Implement ExpiringLock and -ResourceLocker](https://github.com/solid/community-server/commit/9fd844052572c9a7c3e041c5e1a225703a0e5fe9)
* [feat: Add a monitoring store.](https://github.com/solid/community-server/commit/4ef4d44a3a26c6d988a7dc284e99e8d2c7c2c98d)
* [feat: Add WebSocket functionality to server.](https://github.com/solid/community-server/commit/59487410b1af5dc63904f5e1ad4648a2d3c16f38)
* [feat: Implement the Solid WebSocket protocol.](https://github.com/solid/community-server/commit/0099d1d5dc8c5f09b06cbdc9e750778122ddfcb2)
* [feat: Include parent containers in POST and DELETE changes.](https://github.com/solid/community-server/commit/d8799368fdf68d7370391dd3f75fa0945184701a)
* [feat: Advertise WebSocket via Updates-Via header.](https://github.com/solid/community-server/commit/f08617b1c9f9f908573ecdbc03299833428a1b2b)
* [feat: Create function to wrap streams to not lose errors](https://github.com/solid/community-server/commit/1a30b514610fb9cf351cb42fbd0fefc87948920d)
* [feat: Export WebSocket classes.](https://github.com/solid/community-server/commit/4a7ea4ad4692e1a407c4d0a987726d8c142a379f)
* [feat: Wire up WebSockets.](https://github.com/solid/community-server/commit/9b7006872243ed0742bee16582a5da7c6bbcdf59)
* [feat: Add DPoPWebIdExtractor.](https://github.com/solid/community-server/commit/0407a3649077d14c85b74a476146e9d7c73d1996)
* [feat: Add patch logging.](https://github.com/solid/community-server/commit/de079062be3b9daf58b6e9d5589134cb031e0008)
* [feat: Make HeaderHandler customizable.](https://github.com/solid/community-server/commit/d6c0f89cf5c7ac2d0e3fdcd32a04d133f6cbb350)
* [feat: Make CorsHandler customizable.](https://github.com/solid/community-server/commit/8dec921c10363d74ad1c0655b46824d74484be8f)
* [feat: Expose Updates-Via header via CORS.](https://github.com/solid/community-server/commit/49d37dcd6ce3443df3b7efc65fb4d50dd7095c91)
* [feat: Implement --baseUrl flag.](https://github.com/solid/community-server/commit/eabe6bc4ed7966677f62943597a88106d67684cd)
* [feat: Add LDP request logging.](https://github.com/solid/community-server/commit/535cbcd93a0cd91641a0641d028edf3027c93f09)
* [feat: Support the Forwarded header.](https://github.com/solid/community-server/commit/ecfe3cfc46b41d5b7b89a9f541bac32bc99b15fb)
* [feat: create PodHttpHandler with default interfaces](https://github.com/solid/community-server/commit/39745ccf22a8c41751eacbec07318580ef8009cc)
* [feat: add implementations of pod-related interfaces](https://github.com/solid/community-server/commit/9653deec7ff5885950239c318d447d75c99e611a)
* [feat: add template based data generator](https://github.com/solid/community-server/commit/f387b36dc2b318fbcb92b01648da3d02e1d87b3e)
* [feat: integrate pod creation](https://github.com/solid/community-server/commit/1a043aca3f1ca828ee1cb28b97b510ccd15bb965)

### Changed
* [refactor: Create multiple composite handlers](https://github.com/solid/community-server/commit/840965cdef1959ede73874316fce78f59e545c2c)
* [refactor: Make piping consistent](https://github.com/solid/community-server/commit/95ab0b4e760107a06a641b86faac7b385a8b1440)
* [refactor: Remove identifier parameter](https://github.com/solid/community-server/commit/acebf030c7094fa69828e1e170424f442ab24656)
* [refactor: Clean up utility functions](https://github.com/solid/community-server/commit/1073c2ff4c9e18d716e96e795eb94a7f160c551d)
* [refactor: Add isContainerPath function](https://github.com/solid/community-server/commit/75e4f73c3f3aa08bea97042078272ab5713d3b5e)
* [refactor: Add ExpressHttpServerFactory.](https://github.com/solid/community-server/commit/e39e7963eb1f0cc0fb0e5ff6ce2fdc3d8573a8b9)
* [refactor: move ExtensionBasedMapper into mapping directory](https://github.com/solid/community-server/commit/2c46d70780d1af4736156f2b480e8208d2c1b3f4)
* [refactor: abstract parts of ExtensionBasedMapper into MapperUtil](https://github.com/solid/community-server/commit/971e4178d1424292d4371afceb5ea013348336d8)
* [change: use isContainerIdentifier in FixedContentTypeMapper](https://github.com/solid/community-server/commit/f23073b87f16ca9d85745fdae1d92f986bf6cac5)
* [refactor: Move lock stuff in its own folder](https://github.com/solid/community-server/commit/dacfb74a6a0cd07c35923fb513cdb299a67451b6)
* [change: Drop Node 10 support.](https://github.com/solid/community-server/commit/03ffaaed43fb16648dacd1ba4230b02a47b701f4)
* [change: Make credential extractors specialized.](https://github.com/solid/community-server/commit/b0c50b8a7ba3443d8128fcd9967a6086993ebde2)
* [change: Do not warn in canHandle.](https://github.com/solid/community-server/commit/baf68889f98b48c25924aae9ddc0275e88796399)
* [change: Increase logging level of lock expiry.](https://github.com/solid/community-server/commit/1d08f463f692ac4f44c781d101176aa4ec36ac2e)
* [refactor: Separate middleware from Express.](https://github.com/solid/community-server/commit/023ff80f48d551b8bf3eaa50524772889e5f4d7b)
* [change: Move WebSocketAdvertiser to middleware.](https://github.com/solid/community-server/commit/fc3942b372f1b227b2c326661bdc2a036cc1eb20)
* [refactor: Refactor runCli to take optional arguments.](https://github.com/solid/community-server/commit/528688bc4c3fd48f6e42586ff3da28822197fda9)

### Fixed
* [fix: Integrate wrapStreamError to prevent uncaught errors](https://github.com/solid/community-server/commit/e4183333fd523615d24e4d2832224bdd7c45a3d6)
* [fix: Correctly handle acl behaviour for acl identifiers](https://github.com/solid/community-server/commit/ee312910d7f6bc08bd3176168fd6876ffc3d0146)
* [fix: Update quad converter config parameters](https://github.com/solid/community-server/commit/59f99e1728e47e691315995ebb6dc06df99264b5)
* [fix: Rename UnsupportedHttpError into BadRequestError.](https://github.com/solid/community-server/commit/af8f1976cdf083c4dd5da33a146fa4b613bce815)
* [fix: Always release lock when patching](https://github.com/solid/community-server/commit/3362eee2c2a6215afc05d4f5b072e7b23be642ab)
* [fix: Create container data before adding content-type](https://github.com/solid/community-server/commit/c2b189184be8390e2335e60e64bbdab0cfee0863)
* [fix: Do not generate empty INSERT graph.](https://github.com/solid/community-server/commit/0ecbffa8858b7d3992bea09b175cccf91a1942c5)
* [fix: Do not overwrite existing root ACL.](https://github.com/solid/community-server/commit/77db5c0060b28477929eac3c7a5887a19286b790)


<a name="v0.2.0"></a>
## [v0.2.0](https://github.com/solid/community-server/compare/v0.1.1...v0.2.0) - 2020-11-05

### Added
* [feat: Expose types](https://github.com/solid/community-server/commit/1dd14692feed21410557548d877c99ac08c2090f)
* [feat: Implement resource mapper for the file resource store (#142)](https://github.com/solid/community-server/commit/383da24601118d13e32c41b044ed7e69b31cc113)
* [feat: More integration tests and test configs (#154)](https://github.com/solid/community-server/commit/b1991cb08ae722aae497104067a7a455456952c7)
* [feat: Update RepresentationMetadata to store triples](https://github.com/solid/community-server/commit/76319ba360f563122f1d35854b0e846417da2490)
* [feat: Add logging](https://github.com/solid/community-server/commit/99464d9a954569cc1f259b01d28e223550571d7a)
* [feat: Implement HEAD request support](https://github.com/solid/community-server/commit/0644f8d24517b88018f85941d5b74b94c3a443f3)
* [feat: Have ExtensionBasedMapper handle extensions correctly](https://github.com/solid/community-server/commit/b47dc3f7f6038cd48a4964a52d9f1b34e52c0562)
* [feat: Decode URI in target extractor](https://github.com/solid/community-server/commit/bb28af937b4f22cb1d46936ab4668d4c76516cbd)
* [feat: Create MetadataHandler](https://github.com/solid/community-server/commit/7dcb3eaa84058694cf98d642d446d1a2220069b0)
* [feat: Integrate MetadataHandler](https://github.com/solid/community-server/commit/31844a4f40c5e4fc96936c87defa1e1cef3072df)
* [feat: Add support for mocking fs](https://github.com/solid/community-server/commit/e00cb05dc3d60a9bbeb774e569adfac09fedb831)
* [feat: Create DataAccessorBasedStore to have a standard store implementation](https://github.com/solid/community-server/commit/6ad40763f9f52ad470e269fe9989eecb7f7209ac)
* [feat: Create file-based DataAccessor](https://github.com/solid/community-server/commit/9a857b7581c59c46078c3ea56bb0c4aa4f134f9a)
* [feat: Add DataAccessorBasedStore integration](https://github.com/solid/community-server/commit/9b26bbef2d2c26402bf01fbe04f85b08a8ec8be9)
* [feat: Create InMemoryDataAccessor](https://github.com/solid/community-server/commit/b896004bac421a3999eeb2db529025333ec03002)
* [feat: Fully support storing content-type in file extensions](https://github.com/solid/community-server/commit/e861b080c22cb52ad0eab522ac639560e228b6a8)
* [feat: Implement SPARQL-based ResourceStore](https://github.com/solid/community-server/commit/6cc705331098a6a182dfae1dbc6bd1f139b913c4)
* [feat: Support SPARQL store backends](https://github.com/solid/community-server/commit/9f7c2461044f37c55293cc4a2fe38e7a29236cd6)
* [feat: Update RepresentationConvertingStore to convert incoming data](https://github.com/solid/community-server/commit/712a690904e544ebfaea21acdcf7d25256c7c07f)
* [feat: Implement a first draft of the RoutingResourceStore](https://github.com/solid/community-server/commit/86de805daae7637c148e2b420f0de059ff400c8c)
* [feat: Create a RoutingResourceStore that takes routing rules](https://github.com/solid/community-server/commit/5287cd1e41f3e0bac2ff8994176611bb10aad29d)
* [feat: Create multiple configs supporting different store backends](https://github.com/solid/community-server/commit/892b5f5921565a45e32a48b0b8b50b914779a38f)
* [feat: Create routing configs and partially clean up config structure](https://github.com/solid/community-server/commit/f8542a2c0c0bbda69a7913d6d3076618ab075a10)

### Changed
* [refactor: Rename BasePermissionsExtractor to MethodPermissionsExtractor](https://github.com/solid/community-server/commit/ba8b3575b0ac70e58768a17ac77a5e74193b5924)
* [refactor: Simplify MethodPermissionsExtractor](https://github.com/solid/community-server/commit/389fb333345b4331bc4ae29cc1cd369a7187210d)
* [refactor: More precise error messages](https://github.com/solid/community-server/commit/063437e5c1b83a36978469bcb9fbc818fe627dcf)
* [refactor: Make PassthroughStore generic](https://github.com/solid/community-server/commit/3d9507879beb77a8acb0144d472e63b875adea9b)
* [chore: update to componentsjs-generator with generics support](https://github.com/solid/community-server/commit/e9983d5837d579c6da0696c3ad6c58a661d4ec33)
* [refactor: Remove RuntimeConfig in favor of config variables, Closes #106](https://github.com/solid/community-server/commit/1dd140ab61845ae8df67c16883136736146549dd)
* [refactor: Streamline RepresentationMetadata interface](https://github.com/solid/community-server/commit/8d3979372b44b9367129c28cbffaad120691e675)
* [refactor: Make URI constants consistent](https://github.com/solid/community-server/commit/85df2e5d7f990b1108cc4da1a63dd18b5f739d87)
* [refactor: Fix typo](https://github.com/solid/community-server/commit/c150da337eee1419783e4bfc2960c48553fd5e2e)
* [refactor: Update eslint related dependencies](https://github.com/solid/community-server/commit/9657fbafb1cf30b23b4da5237e553fe7a82bddee)
* [refactor: Apply naming-convention rules](https://github.com/solid/community-server/commit/e349e041195fc982e80bc82ddb6ab2aa1c1293e0)
* [refactor: Rename UriUtil functions](https://github.com/solid/community-server/commit/e1533a0869071bbeabf0edfdfd05ccf57883cdaa)
* [refactor: Remove Turtle to Quad and Quad to Turtle converters](https://github.com/solid/community-server/commit/d8e6c0885984b5a144117f5128d1f6b1837b2e99)
* [refactor: Move file related metadata to FileResourceStore](https://github.com/solid/community-server/commit/fa935cc4c7064e3fc4f5866e9febcb43cfd84a10)
* [refactor: Let caller decide which error pipeStreamAndErrors should throw](https://github.com/solid/community-server/commit/006f7ea7aa986dcf3bb9cfd3329e509cd1ca90eb)
* [refactor: Rename instances of data resource to document](https://github.com/solid/community-server/commit/626b3114f413af2eb87c00c880ed86dc7569bb08)
* [refactor: Remove file and in memory stores](https://github.com/solid/community-server/commit/03c64e561707a4880822338817dc030b97a0f53f)
* [refactor: Make ExtensionBasedMapper only expose what is needed](https://github.com/solid/community-server/commit/4df26454d44a71e676342fc4c5b37fa9e2ee118c)
* [refactor: Implement empty canHandle on base class. (#289)](https://github.com/solid/community-server/commit/1a45b65df702815a65cc6fb539a6687eea5d3194)
* [chore: Organize tests (#292)](https://github.com/solid/community-server/commit/73a56d8682711fedd8f54216275e521c44a51670)
* [chore: Use Jest recommended linting.](https://github.com/solid/community-server/commit/4b4f7370137dbbacf2ef2c887e952ad6d7e55622)
* [refactor: Change constructor so it is supported by Components.js](https://github.com/solid/community-server/commit/dee4eef131f1852dd62428ff122d73630070d710)
* [refactor: Change routing constructors to work with Components.js](https://github.com/solid/community-server/commit/50dfea1a27b461ea8ca87526165d33f0d991c44a)
* [refactor: Change PreferenceSupport constructor to work with Components.js](https://github.com/solid/community-server/commit/ef6f01a82cc3c17d6b77b824ace707e2602732a0)
* [chore: Add docker npm scripts.](https://github.com/solid/community-server/commit/5f4f4b08b00b8c9004fc266ebdcb5fcab9611e52)
* [chore: Enable/disable Docker testing with a flag.](https://github.com/solid/community-server/commit/fe870f073a672316eb488964c7525884a7a0eb2d)

### Fixed
* [fix: metadata file error in FileResourceStore](https://github.com/solid/community-server/commit/c808dfeff09e26a4b31199cc0eec9db8667add28)
* [fix: Retain status codes when combining errors](https://github.com/solid/community-server/commit/10723bb6b866316c2f20da0fe47349bd5f52edf5)
* [fix: Have AsyncHandlers only check what is necessary](https://github.com/solid/community-server/commit/4d34cdd12f6dfcc5d5df64bd5c90b13148f69cfb)
* [Fix typo.](https://github.com/solid/community-server/commit/79defc3abb77d1454038c8a8e25b79494a9f4a6b)
* [fix: Make sure all URI characters are correctly encoded](https://github.com/solid/community-server/commit/e85ca622da0c8e3ef8344332e162cfe327f74551)
* [fix: Fix test issues](https://github.com/solid/community-server/commit/22962192ffff5eac028ef3604e1cd989331cbff0)
* [fix: Remove metadata file if no new metadata is stored](https://github.com/solid/community-server/commit/63f891c0f17ee915af21805ca114d2a9a90fb62e)
* [fix: Provide full coverage for util functions](https://github.com/solid/community-server/commit/c999abb7b074bd2f0b93c9cfca198324ec9b43ef)
* [fix: Correctly parse URL domain](https://github.com/solid/community-server/commit/5fa068687b3e99fb388e9c6bf1d3714a3695afaa)
* [fix: Resolve duplicate error message and no trailing newline](https://github.com/solid/community-server/commit/a7fa61ab2fc323372b889cab228cec3580e864fb)
* [fix: Write tests and fix related bugs, refactor code](https://github.com/solid/community-server/commit/dff4ba8efe2c0613c6184ee0a3ff7dcdb3587840)


<a name="v0.1.1"></a>
## [v0.1.1](https://github.com/solid/community-server/compare/v0.1.0...v0.1.1) - 2020-09-03

### Fixed
* [docs: Copyfitting on README](https://github.com/solid/community-server/commit/c3c4424636620c468824f9374d1da4b1558fd5b2)
* [fix: Move dependencies to production](https://github.com/solid/community-server/commit/80aad8ab07811ef5070cadfb3b0aabdc6f4214c9)


<a name="v0.1.0"></a>
## [v0.1.0](https://github.com/solid/community-server/compare/b949b6cf...v0.1.0) - 2020-09-03

### Added
* [feat: Send server identification](https://github.com/solid/community-server/commit/4965b476c9eb6405932d8e0b51039ac64e983525)
* [feat: Integrate ChainedConverter into the server](https://github.com/solid/community-server/commit/3931d5f6642c8ce8aaa8116a369ccaa1c0d494f6)
* [feat: Dynamically determine matching types in ChainedConverter](https://github.com/solid/community-server/commit/af4a82f4c18cdd2b7ff951bec4569e4001994c08)
* [feat: Create RepresentationConverter that chains other converters](https://github.com/solid/community-server/commit/734f7e7f0f2630c8ce0ba4a6a0a1fd5ccbe50c1f)
* [feat: allow custom config to be passed](https://github.com/solid/community-server/commit/09707a9e6de1161aee3d4a84748f8dcea1cb51ba)
* [feat: Enable dependency injection with auto-generated components](https://github.com/solid/community-server/commit/db04c55196d15f86c6dadce557d9053ba188aed5)
* [feat: add support for parsing more RDF formats using rdf-parse](https://github.com/solid/community-server/commit/e88e680ed7bd2799cdfd6f627dfc85f064dee94c)
* [feat: Support link and slug headers in SimpleBodyParser](https://github.com/solid/community-server/commit/86d5f367d52b769b563a8ad6ea1a02274f9ec5ab)
* [feat: Move runtime config into dedicated component, Closes #67](https://github.com/solid/community-server/commit/5126356c940bb12d9765bbd3571b6f1f6fa65cd0)
* [feat: Add file based ResourceStore (#52)](https://github.com/solid/community-server/commit/381dae42f689a11937ca4daf0227d0bd16064ce3)
* [feat: Add more extensive permission parsing support](https://github.com/solid/community-server/commit/e06d0bc8c5fed72a47bf8e82f0affba27e1f77bb)
* [feat: Integrate acl with rest of server](https://github.com/solid/community-server/commit/769b49293cffa77cd7381331bc59e488d7e8f4c9)
* [feat: Add acl support](https://github.com/solid/community-server/commit/0545ca121eedec5541900aa1411dbeea8af015e2)
* [feat: Integrate data conversion with rest of server](https://github.com/solid/community-server/commit/4403421c49e02b851c29e3cb29f248f00f03f639)
* [feat: Convert data from ResourceStore based on preferences](https://github.com/solid/community-server/commit/5e1bb10f81dbc81f6d0700a8c108030e5392b36d)
* [feat: Specifiy constants in separate file](https://github.com/solid/community-server/commit/14db5fed91005bc4f9c92aabbe1675b33b6e28a8)
* [feat: Integrate PATCH functionality](https://github.com/solid/community-server/commit/0e486cf6a6160b6e14a11ae988673b24b86f7303)
* [feat: Add support for SPARQL updates on ResourceStores](https://github.com/solid/community-server/commit/04a12c723eefb21b086bdb29e122b4726b1a3e18)
* [feat: Add OperationHandler for PATCH](https://github.com/solid/community-server/commit/482991cb9a94bd2b77b7ad64e0fc11edf5db1c50)
* [feat: Add BodyParser for SPARQL updates](https://github.com/solid/community-server/commit/95c65c86a70b63929ac902e005d809c4621bd759)
* [feat: Add lock functionality](https://github.com/solid/community-server/commit/a9b811a5a3c14c9774878b0e5a722ae9095c6c92)
* [feat: Add prepare script](https://github.com/solid/community-server/commit/a4dc00141cc4efaea782701d184a37f3176ecedd)
* [feat: Set up server using express](https://github.com/solid/community-server/commit/a9dc59bf78393ad6384599ae2f9a901c4b1b6bc2)
* [feat: Add coveralls support](https://github.com/solid/community-server/commit/792323797d4e1d1b97b9fadb32728d6196e7f132)
* [feat: Validate Accept* headers while parsing](https://github.com/solid/community-server/commit/64a3f908316048f826dd0515c56b670b32a15282)
* [feat: Fully support Accept* headers](https://github.com/solid/community-server/commit/9d9f7df5d18b035b036e78ae79019f79b86d9818)
* [feat: add simple response writer](https://github.com/solid/community-server/commit/618005675f50e7c78a25e9059d9706afd18ba1fe)
* [feat: add simple operation handlers](https://github.com/solid/community-server/commit/fe8749390cfe528a5b0c3abc5d3aff949dc5ce8a)
* [feat: add simple resource store](https://github.com/solid/community-server/commit/12fd00e3b8607746fd0304c2372fcb8840e954df)
* [feat: add simple permissions related handlers](https://github.com/solid/community-server/commit/d983fca8f5ae4dcd15adcd03d30303977a72c187)
* [feat: add response description interface](https://github.com/solid/community-server/commit/e0343fca54d6a779fd94df9863db2b28bb9ba332)
* [feat: add simple request parser](https://github.com/solid/community-server/commit/cf258d0317feb8988dff97bf39e262a8cdfc1b94)
* [feat: add simple preference parser](https://github.com/solid/community-server/commit/09eb665c12e08afb0673d4748099b120481d3033)
* [feat: add simple target extractor](https://github.com/solid/community-server/commit/3c8a08761570616fb45af02de1e987a18ce80788)
* [feat: add simple body parser](https://github.com/solid/community-server/commit/d4f70d9c59fd5eaa767f7d862b8117365cd28e8e)
* [feat: add request parsing related interfaces](https://github.com/solid/community-server/commit/70af46933bc055397ee70ee7f4e1801c95bdd9d7)
* [feat: add typed readable](https://github.com/solid/community-server/commit/e0d74fd68af3575f267f8abc87c51a6fbab28d12)
* [feat: Add README with architecture links](https://github.com/solid/community-server/commit/aaf3f8e3aa890219e2a147622605ba2b62b729ee)
* [feat: add AuthenticatedLdpHandler](https://github.com/solid/community-server/commit/3e2cfaf11ee13c2ae3cb3e46f4df78c13c9d19cf)
* [feat: add FirstCompositeHandler to support multiple handlers](https://github.com/solid/community-server/commit/4229932a3ac75c2532da4e495e96b779fc5b6c92)
* [feat: add custom errors](https://github.com/solid/community-server/commit/57405f3e2695f3a82628e02052695314d656af95)
* [feat: add additional supported interfaces](https://github.com/solid/community-server/commit/a4f2b3995c3e8cfeacf5fe3dbbc0eeb8020f9c9e)
* [Initial configuration](https://github.com/solid/community-server/commit/b949b6cf5eade549b91731edcd1c4d931537a42e)
