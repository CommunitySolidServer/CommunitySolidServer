# Migrating account data from v6 to v7

Below is a description of the changes that are necessary to migration account data from v6 to v7 of the server.
Note that the resource identifier values are bas64 encoded before being appended to the storage location.

* "Forgot password" records
    * **Storage location**
        * Old: `.internal/forgot-password/`
        * New: `.internal/accounts/login/password/forgot/`
    * **Resource identifiers**
        * Old: `"forgot-password-resource-identifier/" + recordId`
        * New: `recordId`
    * **Data format**
        * Old: `{ recordId, email }`
        * New: `email`
    * **Notes**
        * Just deleting all existing records is an acceptable solution as these do not contain important information.
* Client credentials tokens
    * **Storage location**
        * Old: `.internal/accounts/credentials/`
        * New: `.internal/accounts/client-credentials/`
    * **Resource identifiers**
        * No change
    * **Data format**
        * Old: `{ webId, secret }`
        * New: `{ accountId, webId, secret }`
    * **Notes**
        * Account IDs will need to be generated first before these can be transferred.
* Account and password data
    * **Storage location**
        * Old: `.internal/accounts/`
        * New: Split up over the following:
            * `.internal/accounts/data/`
            * `.internal/accounts/webIds/`
            * `.internal/accounts/logins/password/`
    * **Resource identifiers**
        * Old: `"account/" + encodeURIComponent(email)` or `webId`
        * New:
            * `.internal/accounts/data/`: Newly generated account ID.
            * `.internal/accounts/webIds/`: `webID`
            * `.internal/accounts/logins/password/`: `encodeURIComponent(email.toLowerCase())`
    * **Data format**
        * Old: `{ webId, email, password, verified }` or `{ useIdp, podBaseUrl?, clientCredentials? }`
        * New:
            * `.internal/accounts/data/`: `{ id, logins: { password }, pods, webIds, clientCredentials }`
            * `.internal/accounts/webIds/`: `accountId[]`
            * `.internal/accounts/logins/password/`: `{ accountId, password, verified }`
    * **Notes**
        * First account IDs need to be generated,
      then login/pod/webId/clientCredentials resources need to be generated,
      and then the account needs to be updated with those resources.
        * Resource URLs are generated as follows:
            * Passwords: `<baseUrl>/.account/account/<accountID>/login/password/<encodeURIComponent(email.toLowerCase())>`
            * Pods: `<baseUrl>/.account/account/<accountID>/pod/<sha256Hash(podBaseUrl)>`
            * WebIds: `<baseUrl>/.account/account/<accountID>/webid/<sha256Hash(webId)>`
            * Client Credentials: `<baseUrl>/.account/account/<accountID>/client-credentials/<token>`
        * The above URLs are the values in all the account objects,
      the keys are the corresponding (lowercase) email, pod base URL, webID, and token name.
        * Only WebIDs where `useIdp` is `true` need to be linked to the account.
        * In the previous version, a WebID will be linked to exactly 1 account.
