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
 * Registers a user with the server.
 * @param user - The user settings necessary to register a user.
 */
async function register(user: User): Promise<void> {
  const body = JSON.stringify({
    ...user,
    confirmPassword: user.password,
    createWebId: true,
    register: true,
    createPod: true,
  });
  const res = await fetch(urljoin(baseUrl, '/idp/register/'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  if (res.status !== 200) {
    throw new Error(`Registration failed: ${await res.text()}`);
  }
}

/**
 * Requests a client credentials API token.
 * @param user - User for which the token needs to be generated.
 * @returns The id/secret for the client credentials request.
 */
async function createCredentials(user: User): Promise<{ id: string; secret: string }> {
  const res = await fetch(urljoin(baseUrl, '/idp/credentials/'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password, name: 'token' }),
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
 * @param user - User for which data needs to be generated.
 */
async function outputCredentials(user: User): Promise<void> {
  await register(user);
  const { id, secret } = await createCredentials(user);

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
