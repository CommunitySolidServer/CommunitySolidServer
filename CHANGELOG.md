# Changelog
All notable changes to this project will be documented in this file.

<a name="v0.1.1"></a>
## [v0.1.1](https://github.com/solid/community-server/compare/v0.1.0...v0.1.1) - 2020-09-03

### Fixed
* [docs: Copyfitting on README](https://github.com/solid/community-server/commit/c3c4424636620c468824f9374d1da4b1558fd5b2)
* [fix: Move dependencies to production](https://github.com/solid/community-server/commit/80aad8ab07811ef5070cadfb3b0aabdc6f4214c9)

<a name="v0.1.0"></a>
## [v0.1.0] - 2020-09-03

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
* [feat: add CompositeAsyncHandler to support multiple handlers](https://github.com/solid/community-server/commit/4229932a3ac75c2532da4e495e96b779fc5b6c92)
* [feat: add custom errors](https://github.com/solid/community-server/commit/57405f3e2695f3a82628e02052695314d656af95)
* [feat: add additional supported interfaces](https://github.com/solid/community-server/commit/a4f2b3995c3e8cfeacf5fe3dbbc0eeb8020f9c9e)
* [Initial configuration](https://github.com/solid/community-server/commit/b949b6cf5eade549b91731edcd1c4d931537a42e)
