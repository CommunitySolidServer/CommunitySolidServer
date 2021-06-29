# Unable to include my component in the config file

You may be getting an error in the form of:
```
Error: Invalid components file... Could not expand the JSON-LD shortcut "MyClass". Are all the required modules available and JSON-LD contexts included?'
```

This could have several causes:
* The class is not exported from `index.ts`.
* The used component name does not correspond to the exported class name.
* The class has not been compiled using `npm run build`.