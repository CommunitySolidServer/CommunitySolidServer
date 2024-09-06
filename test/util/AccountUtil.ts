import { joinUrl } from '../../src/util/PathUtil';

export type User = {
  email: string;
  password: string;
  webId?: string;
  podName: string;
  settings?: Record<string, unknown>;
};

/**
 * Registers an account for the given user details and creates one or more pods.
 *
 * @param baseUrl - Base URL of the server.
 * @param user - User details to register.
 */
export async function register(baseUrl: string, user: User):
Promise<{ pod: string; webId: string; authorization: string; controls: any }> {
  // Get controls
  let res = await fetch(joinUrl(baseUrl, '.account/'));
  let { controls } = await res.json();

  // Create account
  res = await fetch(controls.account.create, { method: 'POST' });
  expect(res.status).toBe(200);
  const authorization = `CSS-Account-Token ${(await res.json()).authorization}`;

  // Get account controls
  res = await fetch(controls.account.create, {
    headers: { authorization },
  });
  if (res.status !== 200) {
    throw new Error(`Error creating account: ${await res.text()}`);
  }
  const json = await res.json();
  ({ controls } = json);

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
    throw new Error(`Error adding login method: ${await res.text()}`);
  }

  // Create pod(s)
  res = await fetch(controls.account.pod, {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: JSON.stringify({ name: user.podName, settings: { webId: user.webId, ...user.settings }}),
  });
  if (res.status !== 200) {
    throw new Error(`Error creating pod: ${await res.text()}`);
  }

  return { ...await res.json(), controls, authorization };
}
