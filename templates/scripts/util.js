/**
 * Returns an object that maps IDs to the corresponding element.
 *
 * @param ...ids - IDs of the element (empty to retrieve all elements)
 */
function getElements(...ids) {
  ids = ids.length ? ids : [...document.querySelectorAll("[id]")].map(e => e.id);
  return Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
}

// TODO: tsdoc
/**
 * Acquires all data from the given form and POSTs it as JSON to the target URL.
 * In case of failure this function will throw an error.
 * In case of success a parsed JSON body of the response will be returned,
 * unless the body contains a `location` field,
 * in that case the page will be redirected to that location.
 *
 * @param formId - ID of the form. Defaults to 'mainForm'.
 * @param target - Target URL to POST to. Defaults to the current URL.
 * @param transform - Transform function that will get as input the JSON generated from the form.
 *                    The output of this function will be used as a body.
 *                    Does nothing if undefined.
 * @returns {Promise<unknown>} - The response JSON.
 */
async function postJsonForm(target = '', expectRedirect = false, transform = (json) => json, formId = 'mainForm') {
  const form = document.getElementById(formId);
  const formData = new FormData(form);
  const json = transform(Object.fromEntries(formData));
  const res = await fetch(target, {
    method: 'POST',
    credentials: 'include',
    headers: { 'accept': 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(json),
  });
  if (res.status >= 400) {
    const error = await res.json();
    throw new Error(`${error.statusCode} - ${error.name}: ${error.message}`);
  } else if (res.status === 200 || res.status === 201) {
    const body = await res.json();
    if (body.location) {
      location.href = body.location;
    } else {
      if (expectRedirect) {
        throw new Error('Expected a location field in the response.');
      }
      return body;
    }
  }
}

// TODO: tsdoc
/**
 * Adds a listener to the given form to catch the form submission and do an API call instead.
 * In case of an error, the inner text of the given error block will be updated with the message.
 * In case of success the callback function will be called.
 *
 * @param callback - Callback function that will be called with the response JSON.
 * @param formId - ID of the form.
 * @param errorId - ID of the error block.
 */
function addPostListener(callback, formId = 'mainForm', errorId = 'error') {
  const form = document.getElementById(formId);
  const errorBlock = document.getElementById(errorId);

  form.addEventListener('submit', async(event) => {
    event.preventDefault();

    try {
      await callback();
    } catch (error) {
      errorBlock.innerText = error.message;
    }
  });
}

// TODO: prolly will need to update this
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

// TODO: see how many of these can be reused above

/**
 * Returns the controls object that can be found accessing the given URL.
 */
async function fetchControls(url) {
  return (await fetchJson(url)).controls;
}

/**
 * POSTs JSON to the given URL and returns the response.
 */
async function postJson(url, json) {
  return fetch(url, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(json),
  });
}

/**
 * Sets the contents of the error block to the given error message.
 * Default ID of the error block is `error`.
 */
function setError(message, errorId = 'error') {
  const errorBlock = document.getElementById(errorId);
  errorBlock.innerText = message;
}

/**
 * Causes the page to redirect to a specific page when a button is clicked.
 * @param element - The id of the button.
 * @param url - The URL to redirect to.
 */
function setRedirectClick(element, url) {
  document.getElementById(element).addEventListener('click', () => location.href = url);
}
