The community server is fully written in [Typescript](https://www.typescriptlang.org/docs/home.html). 

All changes should be done through [pull requests](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request-from-a-fork). There are strict requirements from the linter and the test coverage before a PR is valid. These are configured to run automatically when trying to commit to git. Although there are no tests for it (yet), we strongly advice documenting with [TSdoc](https://github.com/microsoft/tsdoc).

The initial architecture document the project was started from can be found [here](https://rubenverborgh.github.io/solid-server-architecture/solid-architecture-v1-3-0.pdf). Even though some changes and additions have been made it is still mostly accurate.

A draft of the Solid spec can be found [here](https://github.com/solid/specification). It is still incomplete but much information can also be found in the issues. An older version can be found [here](https://github.com/solid/solid-spec/). Note that this last one is not fully accurate anymore but can still give a general overview of certain components.

Solid is inspired by LDP (Linked Data Platform) of which the spec can be found [here](https://www.w3.org/TR/ldp/). It doesn't strictly follow the spec though.

An example of how a Solid request needs to be parsed and handled can be found [here](https://github.com/solid/solid-architecture/blob/master/server/request-flow.md), including the correct status codes for specific responses.

As can be seen from the architecture, the main idea is that all components can easily be interchanged for other versions with a different implementation. This makes it imperative to reduce direct dependencies between components, which is why in general one class should never instantiate another class, it should only accept other objects through its constructors. This also makes testing much easier due to the independence of components.

Many RDF utility libraries can be found [here](https://rdf.js.org/).

## Add components to configuration

After implementing and testing your component, you have to _configure_ it so that it is enabled when starting the server.

### Dependency Injection

Due to the large number of components in this server, we make use of the _dependency injection_ framework [Components.js](https://github.com/LinkedSoftwareDependencies/Components.js).
This framework allows us to configure our components in a JSON file.
The advantage of this is that changing the configuration of components does not require any changes to the code, as one can just change the default configuration file, or provide a custom configuration file.

### Config file structure

In order to add a component to the default configuration,
you will have to update [`config/default.json`](https://github.com/solid/community-server/tree/master/config/default.json),
or any of its _imported_ files, which exist in the [`config subfolders`](https://github.com/solid/community-server/tree/master/config/).

A component in a configuration file has the following structure:
```json
{
  "@id": "urn:solid-server:my:ResourceStore",
  "@type": "PatchingStore",
  "PatchingStore:_source": {
    "@id": "urn:solid-server:my:ResourceStore_Converting"
  },
  "PatchingStore:_patcher": {
    "@id": "urn:solid-server:my:PatchHandler"
  }
}
```

The important elements here are the following:
* `"@id"`: _(optional)_ A unique identifier of this component, which allows it to be used as parameter values in different places.
* `"type"`: The class name of the component. This must be a TypeScript class name that is exported via `index.ts`.
* `"PatchingStore:_source"`: _(optional)_ A constructor parameter of the `PatchingStore` class. For other classes, this will always have the structure `"[ClassName]:_[parameterName]"`.

### Tips & Tricks

As shown in the example above, the parameters `"PatchingStore:_source"` and `"PatchingStore:_patcher"` contain another `"@id"` as value. These `"@id"`'s MUST always refer to another valid component, either defined inline or elsewhere.

Defining an `"@id"` for a component is only required when your component is being used in different places. If it's just being used once as parameter value of another component, you can omit `"@id"` and define the component inline.

If you edit this config file, `npm run build` MUST have been invoked before so that the TypeScript files have been properly compiled, and the `components/` folder has been populated. The `components/` folder consists of a declarative representation of the TypeScript classes which are referred to from the config file. Since these files are auto-generated, you should NEVER change these files manually. This folder is generated using [Components-Generator.js](https://github.com/LinkedSoftwareDependencies/Components-Generator.js/).

Learn more about Components.js in its [documentation](https://componentsjs.readthedocs.io/en/latest/).

## Releasing a new version

_This is only relevant to developers with push-access._

Making a new release can be done by following these steps:

```bash
$ npm version [major|minor|patch] -m "Release version %s of the npm package."
$ npm publish
$ git push --tags
$ git push origin master
```

(If you call this often, you can [copy this script](https://github.com/rubensworks/dotfiles/blob/master/bin/npm-release) into your dotfiles.)

When calling `npm version`, a new entry in `CHANGELOG.md` will [automatically be generated](https://github.com/rubensworks/manual-git-changelog.js) based on the git commits since last release.
The process will _halt_ until you confirm the changes in `CHANGELOG.md`.
Before confirming, it is recommended to have a look at this file, move around the commits if needed, and save the file.

**Note:** The changelog generator will make use of git tags to determine the range commit. While `npm version` will generate a git tag, you can also create one manually if you want to follow a different release process.
