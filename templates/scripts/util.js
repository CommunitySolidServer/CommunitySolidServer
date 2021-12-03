/**
 * Acquires all data from the given form and POSTs it as JSON to the target URL.
 * In case of failure this function will throw an error.
 * In case of success a parsed JSON body of the response will be returned,
 * unless the body contains a `location` field,
 * in that case the page will be redirected to that location.
 *
 * @param formId - ID of the form.
 * @param target - Target URL to POST to. Defaults to the current URL.
 * @returns {Promise<unknown>} - The response JSON.
 */
async function postJsonForm(formId, target = '') {
  const form = document.getElementById(formId);
  const formData = new FormData(form);
  const res = await fetch(target, {
    method: 'POST',
    credentials: 'include',
    headers: { 'accept': 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(formData)),
  });
  if (res.status >= 400) {
    const error = await res.json();
    throw new Error(`${error.statusCode} - ${error.name}: ${error.message}`)
  } else if (res.status === 200 || res.status === 201) {
    const body = await res.json();
    if (body.location) {
      location.href = body.location;
    } else {
      return body;
    }
  }
}

/**
 * Redirects the page to the given target with the key/value pairs of the JSON body as query parameters.
 * Controls will be deleted from the JSON to prevent very large URLs.
 * `false` values will be deleted to prevent incorrect serializations to "false".
 * @param json - JSON to convert.
 * @param target - URL to redirect to.
 */
function redirectJsonResponse(json, target) {
  // These would cause the URL to get very large, can be acquired later if needed
  delete json.controls;

  // Remove false parameters since these would be converted to "false" strings
  for (const [key, val] of Object.entries(json)) {
    if (typeof val === 'boolean' && !val) {
      delete json[key];
    }
  }

  const searchParams = new URLSearchParams(Object.entries(json));
  location.href = `${target}?${searchParams.toString()}`;
}

/**
 * Adds a listener to the given form to catch the form submission and do an API call instead.
 * In case of an error, the inner text of the given error block will be updated with the message.
 * In case of success the callback function will be called.
 *
 * @param formId - ID of the form.
 * @param errorId - ID of the error block.
 * @param apiTarget - Target URL to send the POST request to. Defaults to the current URL.
 * @param callback - Callback function that will be called with the response JSON.
 */
async function addPostListener(formId, errorId, apiTarget, callback) {
  const form = document.getElementById(formId);
  const errorBlock = document.getElementById(errorId);

  form.addEventListener('submit', async(event) => {
    event.preventDefault();

    try {
      const json = await postJsonForm(formId, apiTarget);
      callback(json);
    } catch (error) {
      errorBlock.innerText = error.message;
    }
  });
}

/**
 * Updates links on a page based on the controls received from the API.
 * @param url - API URL that will return the controls
 * @param controlMap - Key/value map with keys being element IDs and values being the control field names.
 */
async function addControlLinks(url, controlMap) {
  const json = await fetchJson(url);
  for (let [ id, control ] of Object.entries(controlMap)) {
    updateElement(id, json.controls[control], { href: true });
  }
}

/**
 * Shows or hides the given element.
 * @param id - ID of the element.
 * @param visible - If it should be visible.
 */
function setVisibility(id, visible) {
  const element = document.getElementById(id);
  element.classList[visible ? 'remove' : 'add']('hidden');
  // Disable children of hidden elements,
  // such that the browser does not expect input for them
  for (const child of getDescendants(element)) {
    if ('disabled' in child)
      child.disabled = !visible;
  }
}

/**
 * Obtains all children, grandchildren, etc. of the given element.
 * @param element - Element to get all descendants from.
 */
function getDescendants(element) {
  return [...element.querySelectorAll("*")];
}

/**
 * Updates the inner text and href field of an element.
 * @param id - ID of the element.
 * @param text - Text to put in the field(s).
 * @param options - Indicates which fields should be updated.
 *                  Keys should be `innerText` and/or `href`, values should be booleans.
 */
function updateElement(id, text, options) {
  const element = document.getElementById(id);
  if (options.innerText) {
    element.innerText = text;
  }
  if (options.href) {
    element.href = text;
  }
}

/**
 * Fetches JSON from the url and converts it to an object.
 * @param url - URL to fetch JSON from.
 */
async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  return res.json();
}
