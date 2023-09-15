# Migrating account data from v6 to v7

Below is a description of the changes that are necessary to migration account data from v6 to v7 of the server.

The format of the "Forgot passwords records was changed",
but seeing as those are not important and new ones can be created if necessary,
these can just be removed when migrating.
By default, these were located in the `.internal/forgot-password/` folder so this entire folder can be removed.

For existing accounts, the data was stored in the following format and location.
Additionally to the details below, the tail of all resource identifiers were base64 encoded.

* **Account data**
    * Storage location: `.internal/accounts/`
    * Resource identifiers: `"account/" + encodeURIComponent(email)`
    * Data format: `{ webId, email, password, verified }`
* **Account settings**
    * Storage location: `.internal/accounts/`, so same location as the account data
    * Resource identifiers: `webId`
    * Data format: `{ useIdp, podBaseUrl?, clientCredentials? }`
        * `useIdp` indicates if the WebID is linked to the account for identification.
        * `podBaseUrl` is defined if the account was created with a pod.
        * `clientCredentials` is an array containing the labels of all client credentials tokens created by the account.
* **Client credentials tokens**
    * Storage location: `.internal/accounts/credentials/`
    * Resource identifiers: the token label
    * Data format: `{ webId, secret }`

The best way to migrate the data would be to read in the old data,
and make use of the new classes to generate the new account objects,
as generating the data manually might be too cumbersome.
Ideally the account classes of the previous version can be reused to read in the older data
to prevent having to read the old data directly.

During migration, WebID ownership validation would need to be disabled
as otherwise the server won't allow linking the WebIDs.
The password values can be reused as the password storage method was not changed.
