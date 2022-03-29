# How to seed Accounts and Pods
If you need to seed accounts and pods, set the `--seededPodConfigJson` option to a file such as `./seeded-pod-config.json` to set your desired accounts and pods. The contents of `./seeded-pod-config.json` (or whatever file name you choose) should be a JSON array whose entries are objects which include
`podName`, `email`, and `password`. For example:
```json
    [
      {
        "podName": "example",
        "email": "hello@example.com",
        "password": "abc123"
        }
    ]
```

You may optionally specify other parameters accepted by the `register` method of [RegistrationManager](https://github.com/solid/community-server/blob/3b353affb1f0919fdcb66172364234eb59c2e3f6/src/identity/interaction/email-password/util/RegistrationManager.ts#L173). For example:

To use a pre-existing wedId:
```json
  createWebId: false,
  webId: "https://pod.inrupt.com/example/profile/card#me"
```
