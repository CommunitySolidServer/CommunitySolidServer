#!/usr/bin/env ts-node
/* eslint-disable no-console */
import fetch from 'cross-fetch';
import urljoin from 'url-join';

if (process.argv.length !== 3) {
  throw new Error('Exactly 1 parameter is needed: the server URL.');
}

const baseUrl = process.argv[2];

type User = {
  email: string;
  password: string;
  podName: string;
};

const alice: User = {
  email: 'alice@example.com',
  password: 'alice-secret',
  podName: 'alice',
};

const bob: User = {
  email: 'bob@example.com',
  password: 'bob-secret',
  podName: 'bob',
};

/**
 * Registers a user with the server and provides them with a pod.
 *
 * @param user - The user settings necessary to register a user.
 */
async function register(user: User): Promise<{ webId: string; authorization: string }> {
  // Get controls
  let res = await fetch(urljoin(baseUrl, '.account/'));
  let { controls } = await res.json();

  // Create account
  res = await fetch(controls.account.create, { method: 'POST' });
  if (res.status !== 200) {
    throw new Error(`Account creation failed: ${await res.text()}`);
  }
  const authorization = `CSS-Account-Token ${(await res.json()).authorization}`;

  // Get account controls
  res = await fetch(controls.main.index, {
    headers: { authorization },
  });
  ({ controls } = await res.json());

  // Add login method
  res = await fetch(controls.password.create, {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });
  if (res.status !== 200) {
    throw new Error(`Login creation failed: ${await res.text()}`);
  }

  // Create pod
  res = await fetch(controls.account.pod, {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: JSON.stringify({ name: user.podName }),
  });
  if (res.status !== 200) {
    throw new Error(`Pod creation failed: ${await res.text()}`);
  }
  const { webId } = await res.json();

  return { webId, authorization };
}

/**
 * Requests a client credentials API token.
 *
 * @param webId - WebID to create credentials for.
 * @param authorization - Authorization header for the account that tries to create credentials.
 *
 * @returns The id/secret for the client credentials request.
 */
async function createCredentials(webId: string, authorization: string): Promise<{ id: string; secret: string }> {
  let res = await fetch(urljoin(baseUrl, '.account/'), {
    headers: { authorization },
  });
  const { controls } = await res.json();

  res = await fetch(controls.account.clientCredentials, {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'token', webId }),
  });
  if (res.status !== 200) {
    throw new Error(`Token generation failed: ${await res.text()}`);
  }

  return res.json();
}

/**
 * Generates all the necessary data and outputs the necessary lines
 * that need to be added to the CTH environment file
 * so it can use client credentials.
 *
 * @param user - User for which data needs to be generated.
 */
async function outputCredentials(user: User): Promise<void> {
  const { webId, authorization } = await register(user);
  const { id, secret } = await createCredentials(webId, authorization);

  const name = user.podName.toUpperCase();
  console.log(`USERS_${name}_CLIENTID=${id}`);
  console.log(`USERS_${name}_CLIENTSECRET=${secret}`);
}

/**
 * Ends the process and writes out an error in case something goes wrong.
 */
function endProcess(error: Error): never {
  console.error(error);
  process.exit(1);
}

// Create tokens for Alice and Bob
outputCredentials(alice).catch(endProcess);
outputCredentials(bob).catch(endProcess);
