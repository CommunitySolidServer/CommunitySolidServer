/* eslint-disable unused-imports/no-unused-vars */
/**
 * Returns an object that maps IDs to the corresponding element.
 *
 * @param ids - IDs of the element (empty to retrieve all elements)
 */
function getElements(...ids) {
  ids = ids.length > 0 ? ids : [ ...document.querySelectorAll('[id]') ].map(e => e.id);
  return Object.fromEntries(ids.map(id => [ id, document.getElementById(id) ]));
}

/**
 * Acquires all data from the given form and POSTs it as JSON to the target URL.
 * In case of failure this function will throw an error.
 * In case of success a parsed JSON body of the response will be returned,
 * unless a redirect was expected,
 * in which case a redirect will happen or an error will be thrown if there is no location field.
 *
 * @param target - Target URL to POST to. Defaults to the current URL.
 * @param expectRedirect - If a redirect is expected. Defaults to `false`.
 * @param transform - A function that gets as input a JSON representation of the form. The output will be POSTed.
 *                    Defaults to identity function.
 * @param formId - The ID of the form. Defaults to "mainForm".
 */
async function postJsonForm(target = '', expectRedirect = false, transform = json => json, formId = 'mainForm') {
  const form = document.getElementById(formId);
  const formData = new FormData(form);
  const json = transform(Object.fromEntries(formData));
  const res = await postJson(target, json);
  if (res.status >= 400) {
    const error = await res.json();
    throw new Error(error.message);
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

/**
 * Adds a listener to the given form to prevent the default interaction and instead call the provided callback.
 * In case of an error, it will be caught and the message will be shown in the error block.
 *
 * @param callback - Callback to call.
 * @param formId - ID of the form. Defaults to "mainForm".
 * @param errorId - ID of the error block. Defaults to "error".
 */
function addPostListener(callback, formId = 'mainForm', errorId = 'error') {
  const form = document.getElementById(formId);

  // By default, we disable all submit buttons to prevent them from being clicked before content is loaded
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = false;

  form.addEventListener('submit', async(event) => {
    event.preventDefault();

    try {
      return await callback();
    } catch (error) {
      setError(error.message, errorId);
    }
  });
}

/**
 * Shows or hides the given element.
 *
 * @param id - ID of the element.
 * @param visible - If it should be visible.
 */
function setVisibility(id, visible) {
  const element = document.getElementById(id);
  element.classList[visible ? 'remove' : 'add']('hidden');
  // Disable children of hidden elements,
  // such that the browser does not expect input for them
  for (const child of getDescendants(element)) {
    if ('disabled' in child) {
      child.disabled = !visible;
    }
  }
}

/**
 * Obtains all children, grandchildren, etc. of the given element.
 *
 * @param element - Element to get all descendants from.
 */
function getDescendants(element) {
  return [ ...element.querySelectorAll('*') ];
}

/**
 * Updates the inner text and href field of an element.
 *
 * @param id - ID of the element.
 * @param text - Text to put in the field(s). If this is undefined, instead the element will be hidden.
 * @param options - Indicates which fields should be updated.
 *                  Keys should be `innerText` and/or `href`, values should be booleans.
 */
function updateElement(id, text, options) {
  const element = document.getElementById(id);
  setVisibility(id, Boolean(text));
  // Keeping innerText for now as not to suddenly change the name of an option.
  /* eslint-disable unicorn/prefer-dom-node-text-content */
  if (options.innerText) {
    element.innerText = text;
  }
  /* eslint-enable unicorn/prefer-dom-node-text-content */
  if (options.href) {
    element.href = text;
  }
}

/**
 * Fetches JSON from the url and converts it to an object.
 *
 * @param url - URL to fetch JSON from.
 * @param redirectUrl - URL to redirect to in case the response code is >= 400. No redirect happens if undefined.
 */
async function fetchJson(url, redirectUrl) {
  const res = await fetch(url, { headers: { accept: 'application/json' }});

  if (redirectUrl && res.status >= 400) {
    location.href = redirectUrl;
    return;
  }

  return res.json();
}

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
  updateElement(errorId, message, { innerText: true });
}

/**
 * Causes the page to redirect to a specific page when a button is clicked.
 *
 * @param element - The id of the button.
 * @param url - The URL to redirect to.
 */
function setRedirectClick(element, url) {
  document.getElementById(element).addEventListener('click', () => location.href = url);
}

/**
 * Validates a password form to see if the confirmation password matches the password.
 *
 * @param passwordId - The id of the password field.
 * @param formId - ID of the form. Defaults to "mainForm".
 * @param confirmPasswordId - ID of the password confirmation field. Defaults to "confirmPassword".
 */
function validatePasswordConfirmation(passwordId, formId = 'mainForm', confirmPasswordId = 'confirmPassword') {
  const formData = new FormData(document.getElementById(formId));
  if (formData.get(passwordId) !== formData.get(confirmPasswordId)) {
    throw new Error('Password confirmation does not match the password!');
  }
}

/**
 * Creates a `(delete)` link that can be clicked to remove a resource and update the HTML accordingly.
 *
 * @param parent - The HTML object that needs to be removed when the resource is removed.
 * @param url - The URL of the resource.
 * @param fetchParams - Parameters to pass to the fetch request that would remove the resource.
 * @param confirmMsg - Message to show to confirm that the resource needs to be deleted.
 * @param finishMsg - Optional message to show in the error field when the resource was removed.
 *
 * @returns The HTML object representing the `(delete)` link.
 */
function createUrlDeleteElement(parent, url, fetchParams, confirmMsg, finishMsg) {
  const del = document.createElement('a');
  del.textContent = '(delete)';
  del.href = '#';
  del.addEventListener('click', async() => {
    // eslint-disable-next-line no-alert
    if (!confirm(confirmMsg)) {
      return;
    }
    // Delete resource, show error if this fails
    const res = await fetch(url, fetchParams);
    if (res.status >= 400) {
      const error = await res.json();
      setError(error.message);
    } else {
      parent.remove();
      if (finishMsg) {
        setError(finishMsg);
      }
    }
  });
  return del;
}
