# Dependency injection

The community server uses the _dependency injection_ framework
[Components.js](https://github.com/LinkedSoftwareDependencies/Components.js/)
to link all class instances together,
and uses [Components-Generator.js](https://github.com/LinkedSoftwareDependencies/Components-Generator.js)
to automatically generate the necessary description configurations of all classes.
This framework allows us to configure our components in a JSON file.
The advantage of this is that changing the configuration of components does not require any changes to the code, 
as one can just change the default configuration file, or provide a custom configuration file.

More information can be found in the Components.js [documentation](https://componentsjs.readthedocs.io/),
but a summarized overview can be found below.

## Component files
Components.js requires a component file for every class you might want to instantiate.
Fortunately those get generated automatically by Components-Generator.js.
Calling `npm run build` will call the generator and generate those JSON-LD files in the `dist` folder.
The generator uses the `index.ts`, so new classes always have to be added there
or they will not get a component file.

## Configuration files
Configuration files are how we tell Components.js which classes to instantiate and link together.
All the community server configurations can be found in
the [`config` folder](https://github.com/CommunitySolidServer/CommunitySolidServer/tree/main/config/).
That folder also contains information about how different pre-defined configurations can be used.

A single component in such a configuration file might look as follows: 
```json
{
  "comment": "Storage used for account management.",
  "@id": "urn:solid-server:default:AccountStorage",
  "@type": "JsonResourceStorage",
  "source": { "@id": "urn:solid-server:default:ResourceStore" },
  "baseUrl": { "@id": "urn:solid-server:default:variable:baseUrl" },
  "container": "/.internal/accounts/"
}
```

With the corresponding constructor of the `JsonResourceStorage` class:
```ts
public constructor(source: ResourceStore, baseUrl: string, container: string)
```

The important elements here are the following:
* `"comment"`: _(optional)_ A description of this component.
* `"@id"`: _(optional)_ A unique identifier of this component, which allows it to be used as parameter values in different places.
* `"@type"`: The class name of the component. This must be a TypeScript class name that is exported via `index.ts`.

As you can see from the constructor, the other fields are direct mappings from the constructor parameters.
`source` references another object, which we refer to using its identifier `urn:solid-server:default:ResourceStore`.
`baseUrl` is just a string, but here we use a variable that was set before calling Components.js
which is why it also references an `@id`.
These variables are set when starting up the server, based on the command line parameters.
