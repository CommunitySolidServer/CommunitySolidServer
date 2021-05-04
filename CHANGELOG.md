# Changelog
All notable changes to this project will be documented in this file.

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
