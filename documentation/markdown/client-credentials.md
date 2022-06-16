# Automating authentication with Client Credentials

One potential issue for scripts and other applications is that it requires user interaction to log in and authenticate.
The CSS offers an alternative solution for such cases by making use of Client Credentials.
Once you have created an account as described in the [Identity Provider section](dependency-injection.md),
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

The code below generates a token linked to your account and WebID.
This only needs to be done once, afterwards this token can be used for all future requests.

```ts
import fetch from 'node-fetch';

// This assumes your server is started under http://localhost:3000/.
// This URL can also be found by checking the controls in JSON responses when interacting with the IDP API,
// as described in the Identity Provider section.
const response = await fetch('http://localhost:3000/idp/credentials/', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  // The email/password fields are those of your account.
  // The name field will be used when generating the ID of your token.
  body: JSON.stringify({ email: 'my-email@example.com', password: 'my-account-password', name: 'my-token' }),
});

// These are the identifier and secret of your token.
// Store the secret somewhere safe as there is no way to request it again from the server!
const { id, secret } = await response.json();
```

## Requesting an Access token

The ID and secret combination generated above can be used to request an Access Token from the server.
This Access Token is only valid for a certain amount of time, after which a new one needs to be requested.

```ts
import { createDpopHeader, generateDpopKeyPair } from '@inrupt/solid-client-authn-core';
import fetch from 'node-fetch';

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
import fetch from 'node-fetch';

// The DPoP key needs to be the same key as the one used in the previous step.
// The Access token is the one generated in the previous step.
const authFetch = await buildAuthenticatedFetch(fetch, accessToken, { dpopKey });
// authFetch can now be used as a standard fetch function that will authenticate as your WebID.
// This request will do a simple GET for example.
const response = await authFetch('http://localhost:3000/private');
```

## Deleting a token

You can see all your existing tokens by doing a POST to `http://localhost:3000/idp/credentials/`
with as body a JSON object containing your email and password.
The response will be a JSON list containing all your tokens.

Deleting a token requires also doing a POST to the same URL,
but adding a `delete` key to the JSON input object with as value the ID of the token you want to remove.
