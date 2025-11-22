const draftForm = document.getElementById('draft-form');
const draftInput = document.getElementById('draft-input');
const draftList = document.querySelector('[data-drafts]');
const statusBadge = document.querySelector('[data-status="message"]');
const resultStatus = document.querySelector('[data-result-status]');
const outputBlock = document.querySelector('[data-output]');
const optimizeButton = document.getElementById('optimize-prompt');
const principlesForm = document.getElementById('principles-form');
const principlesInput = document.getElementById('principles-input');
const principlesStatus = document.querySelector('[data-principles-status]');

function setStatus(message) {
  if (statusBadge) {
    statusBadge.textContent = message;
  }
}

function setResultStatus(message) {
  if (resultStatus) {
    resultStatus.textContent = message;
  }
}

function setPrinciplesStatus(message) {
  if (principlesStatus) {
    principlesStatus.textContent = message;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Server responded with ${response.status}`);
  }

  return response.json();
}

async function loadDrafts() {
  if (!draftList) return;
  draftList.innerHTML = '';
  try {
    const { drafts } = await fetchJson('/api/drafts');
    if (!drafts.length) {
      draftList.innerHTML = '<li class="empty-state">No drafts saved yet.</li>';
      return;
    }

    drafts.forEach((draft) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.id = draft.id;
      button.dataset.text = draft.text;

      const strong = document.createElement('strong');
      strong.textContent = new Date(draft.createdAt).toLocaleString();

      const span = document.createElement('span');
      span.textContent =
        draft.text.length > 80 ? `${draft.text.slice(0, 80)}…` : draft.text;

      button.append(strong, span);
      li.append(button);
      draftList.append(li);
    });
  } catch (err) {
    setStatus(`Draft load failed: ${err.message}`);
  }
}

async function loadPrinciples() {
  if (!principlesInput) return;
  try {
    const { principles } = await fetchJson('/api/principles');
    principlesInput.value = principles.length ? principles.join('\n') : '';
    setPrinciplesStatus(principles.length ? 'Principles loaded.' : 'No principles saved yet.');
  } catch (err) {
    setPrinciplesStatus(`Principles load failed: ${err.message}`);
  }
}

if (draftList) {
  draftList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button) return;
    const text = button.dataset.text || '';
    draftInput.value = text;
    setStatus('Draft loaded.');
  });
}

if (draftForm) {
  draftForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = draftInput.value.trim();
    if (!value) {
      setStatus('Please provide a draft prompt first.');
      return;
    }

    try {
      setStatus('Saving draft…');
      await fetchJson('/api/drafts', {
        method: 'POST',
        body: JSON.stringify({ text: value })
      });
      setStatus('Draft saved.');
      await loadDrafts();
    } catch (err) {
      setStatus(`Save failed: ${err.message}`);
    }
  });
}

if (principlesForm) {
  principlesForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!principlesInput) return;
    const value = principlesInput.value;
    setPrinciplesStatus('Saving principles…');
    try {
      await fetchJson('/api/principles', {
        method: 'POST',
        body: JSON.stringify({ principles: value })
      });
      setPrinciplesStatus('Principles saved.');
    } catch (err) {
      setPrinciplesStatus(`Save failed: ${err.message}`);
    }
  });
}

if (optimizeButton) {
  optimizeButton.addEventListener('click', async () => {
    const text = draftInput.value.trim();
    if (!text) {
      setResultStatus('Need a draft to optimize.');
      return;
    }

    try {
      setResultStatus('Optimizing…');
      outputBlock.textContent = 'Calling OpenAI…';
      const result = await fetchJson('/api/optimize', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      setResultStatus('Optimization complete');
      outputBlock.textContent = result.raw || 'No response from the service.';
    } catch (err) {
      setResultStatus('Optimization failed');
      outputBlock.textContent = `Error: ${err.message}`;
    }
  });
}

loadDrafts();
loadPrinciples();
