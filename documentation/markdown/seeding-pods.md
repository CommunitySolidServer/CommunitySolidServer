# How to seed Accounts and Pods

If you need to seed accounts and pods, 
the `--seededPodConfigJson` command line option can be used
with as value the path to a JSON file containing configurations for every required pod.
The file needs to contain an array of JSON objects, 
with each object containing at least a `podName`, `email`, and `password` field. 

For example:
```json
[
  {
    "podName": "example",
    "email": "hello@example.com",
    "password": "abc123"
  }
]
```

You may optionally specify other parameters 
as described in the [Identity Provider documentation](./identity-provider.md#json-api).

For example, to set up a pod without registering the generated WebID with the Identity Provider:
```json
[
  {
    "podName": "example",
    "email": "hello@example.com",
    "password": "abc123",
    "webId": "https://pod.inrupt.com/example/profile/card#me",
    "register": false
  }
]
```

This feature cannot be used to register pods with pre-existing WebIDs,
which requires an interactive validation step.
