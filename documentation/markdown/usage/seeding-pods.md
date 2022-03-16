# How to seed Accounts and Pods

If you need to seed accounts and pods,
the `--seedConfig` command line option can be used
with as value the path to a JSON file containing configurations for every required pod.
The file needs to contain an array of JSON objects,
with each object containing at least an `email`, and `password` field.
Multiple pod objects can also be assigned to such an object in the `pods` array to create pods for the account,
with contents being the same as its corresponding JSON [API](account/json-api.md#controlsaccountpod).

For example:

```json
[
  {
    "email": "hello@example.com",
    "password": "abc123"
  },
  {
    "email": "hello2@example.com",
    "password": "123abc",
    "pods": [
      { "name": "pod1" },
      { "name": "pod2" }
    ]
  }
]
```

This feature cannot be used to register pods with pre-existing WebIDs,
which requires an interactive validation step,
unless you disable the WebID ownership check in your server configuration.

Note that pod seeding is made for a default server setup with standard email/password login.
If you [add a new login method](account/login-method.md)
you will need to create a new implementation of pod seeding if you want to use it.
