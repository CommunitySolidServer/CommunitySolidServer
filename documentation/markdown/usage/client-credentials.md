# Automating authentication with Client Credentials

One potential issue for scripts and other applications is that it requires user interaction to log in and authenticate.
The CSS offers an alternative solution for such cases by making use of Client Credentials.
Once you have created an account as described in the [Identity Provider section](identity-provider.md),
users can request a token that apps can use to authenticate without user input.

All requests to the client credentials API currently require you
to send along the email and password of that account to identify yourself.
This is a temporary solution until the server has more advanced account management,
after which this API will change.

Below is example code of how to make use of these tokens.
It makes use of several utility functions from the
[Solid Authentication Client](https://github.com/inrupt/solid-client-authn-js).
Note that the code below uses top-level `await`, which not all JavaScript engines support,
so this should all be contained in an `async` function.

## Generating a token

A token can be created either on your account page, by default `http://localhost:3000/.account/`,
or by calling the relevant [API](account/json-api.md#controlsaccountclientcredentials).

Below is an example of how to call the API to generate such a token.

The code below generates a token linked to your account and WebID.
This only needs to be done once, afterwards this token can be used for all future requests.

Before doing the step below,
you already need to have an [authorization value](account/json-api.md#authorization)
that you get after logging in to your account.

Below is an example of how this would work with
the [email/password API](account/json-api.md#controlspasswordlogin)
from the default server configurations.

```ts
// All these examples assume the server is running at `http://localhost:3000/`.

// First we request the account API controls to find out where we can log in
const indexResponse = await fetch('http://localhost:3000/.account/');
const { controls } = await indexResponse.json();

// And then we log in to the account API
const response = await fetch(controls.password.login, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'my-email@example.com', password: 'my-password' }),
});
// This authorization value will be used to authenticate in the next step
const { authorization } = await response.json();
```

The next step generates the token and assumes you have an authorization value as generated in the example above.

```ts
// Now that we are logged in, we need to request the updated controls from the server.
// These will now have more values than in the previous example.
const indexResponse = await fetch('http://localhost:3000/.account/', {
  headers: { authorization: `CSS-Account-Token ${authorization}` }
});
const { controls } = await indexResponse.json();

// Here we request the server to generate a token on our account
const response = await fetch(controls.account.clientCredentials, {
  method: 'POST',
  headers: { authorization: `CSS-Account-Token ${authorization}`, 'content-type': 'application/json' },
  // The name field will be used when generating the ID of your token.
  // The WebID field determines which WebID you will identify as when using the token.
  // Only WebIDs linked to your account can be used.
  body: JSON.stringify({ name: 'my-token', webId: 'http://localhost:3000/my-pod/card#me' }),
});

// These are the identifier and secret of your token.
// Store the secret somewhere safe as there is no way to request it again from the server!
// The `resource` value can be used to delete the token at a later point in time.
const { id, secret, resource } = await response.json();
```

In case something goes wrong the status code will be 400/500
and the response body will contain a description of the problem.

## Requesting an Access token

The ID and secret combination generated above can be used to request an Access Token from the server.
This Access Token is only valid for a certain amount of time, after which a new one needs to be requested.

```ts
import { createDpopHeader, generateDpopKeyPair } from '@inrupt/solid-client-authn-core';

// A key pair is needed for encryption.
// This function from `solid-client-authn` generates such a pair for you.
const dpopKey = await generateDpopKeyPair();

// These are the ID and secret generated in the previous step.
// Both the ID and the secret need to be form-encoded.
const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
// This URL can be found by looking at the "token_endpoint" field at
// http://localhost:3000/.well-known/openid-configuration
// if your server is hosted at http://localhost:3000/.
const tokenUrl = 'http://localhost:3000/.oidc/token';
const response = await fetch(tokenUrl, {
  method: 'POST',
  headers: {
    // The header needs to be in base64 encoding.
    authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
    'content-type': 'application/x-www-form-urlencoded',
    dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
  },
  body: 'grant_type=client_credentials&scope=webid',
});

// This is the Access token that will be used to do an authenticated request to the server.
// The JSON also contains an "expires_in" field in seconds,
// which you can use to know when you need request a new Access token.
const { access_token: accessToken } = await response.json();
```

## Using the Access token to make an authenticated request

Once you have an Access token, you can use it for authenticated requests until it expires.

```ts
import { buildAuthenticatedFetch } from '@inrupt/solid-client-authn-core';

// The DPoP key needs to be the same key as the one used in the previous step.
// The Access token is the one generated in the previous step.
const authFetch = await buildAuthenticatedFetch(accessToken, { dpopKey });
// authFetch can now be used as a standard fetch function that will authenticate as your WebID.
// This request will do a simple GET for example.
const response = await authFetch('http://localhost:3000/private');
```

## Other token actions

You can see all your existing tokens on your account page
or by doing a GET request to the same API to create a new token.
The details of a token can be seen by doing a GET request to the resource URL of the token.

A token can be deleted by doing a DELETE request to the resource URL of the token.

All of these actions require you to be logged in to the account.
