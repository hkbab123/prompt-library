// ============= STATE =============

const state = {
  currentSessionId: null,
  sessions: [],
  folders: [],
  principles: [],
  isSidebarOpen: false,
  currentMessageToSave: null
};

// ============= DOM ELEMENTS =============

const elements = {
  // Sidebar
  sidebar: document.getElementById('sidebar'),
  newChatButton: document.getElementById('new-chat-button'),
  sessionList: document.getElementById('session-list'),
  folderList: document.getElementById('folder-list'),
  addFolderButton: document.getElementById('add-folder-button'),
  settingsButton: document.getElementById('settings-button'),
  mobileMenuButton: document.getElementById('mobile-menu-button'),
  mobileClose: document.getElementById('mobile-close'),
  
  // Chat
  emptyState: document.getElementById('empty-state'),
  emptyNewChatButton: document.getElementById('empty-new-chat'),
  chatHeader: document.getElementById('chat-header'),
  chatTitle: document.getElementById('chat-title'),
  archiveButton: document.getElementById('archive-button'),
  messagesContainer: document.getElementById('messages-container'),
  messages: document.getElementById('messages'),
  inputContainer: document.getElementById('input-container'),
  messageForm: document.getElementById('message-form'),
  messageInput: document.getElementById('message-input'),
  sendButton: document.getElementById('send-button'),
  
  // Settings Modal
  settingsModal: document.getElementById('settings-modal'),
  principlesInput: document.getElementById('principles-input'),
  modalClose: document.getElementById('modal-close'),
  modalCancel: document.getElementById('modal-cancel'),
  modalSave: document.getElementById('modal-save'),
  
  // Folder Modal
  folderModal: document.getElementById('folder-modal'),
  folderNameInput: document.getElementById('folder-name-input'),
  folderModalClose: document.getElementById('folder-modal-close'),
  folderModalCancel: document.getElementById('folder-modal-cancel'),
  folderModalSave: document.getElementById('folder-modal-save'),
  
  // Save Prompt Modal
  savePromptModal: document.getElementById('save-prompt-modal'),
  promptTitleInput: document.getElementById('prompt-title-input'),
  folderSelect: document.getElementById('folder-select'),
  savePromptModalClose: document.getElementById('save-prompt-modal-close'),
  savePromptModalCancel: document.getElementById('save-prompt-modal-cancel'),
  savePromptModalSave: document.getElementById('save-prompt-modal-save')
};

// ============= API CALLS =============

async function fetchJSON(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

async function loadSessions() {
  const data = await fetchJSON('/api/sessions');
  state.sessions = data.sessions;
  renderSessionList();
}

async function createSession() {
  const data = await fetchJSON('/api/sessions', { method: 'POST' });
  state.sessions.unshift(data.session);
  renderSessionList();
  selectSession(data.session.id);
}

async function loadSession(id) {
  const data = await fetchJSON(`/api/sessions/${id}`);
  return data.session;
}

async function sendMessage(content) {
  const data = await fetchJSON(`/api/sessions/${state.currentSessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
  return data;
}

async function archiveSession(id) {
  await fetchJSON(`/api/sessions/${id}/archive`, {
    method: 'PUT',
    body: JSON.stringify({ archived: true })
  });
  state.sessions = state.sessions.filter(s => s.id !== id);
  renderSessionList();
  if (state.currentSessionId === id) {
    state.currentSessionId = null;
    showEmptyState();
  }
}

async function loadFolders() {
  const data = await fetchJSON('/api/folders');
  state.folders = data.folders;
  renderFolderList();
  updateFolderSelect();
}

async function createFolder(name, parentId = null) {
  const data = await fetchJSON('/api/folders', {
    method: 'POST',
    body: JSON.stringify({ name, parentId })
  });
  state.folders.push(data.folder);
  renderFolderList();
  updateFolderSelect();
}

async function savePromptToFolder(folderId, title, content) {
  await fetchJSON(`/api/folders/${folderId}/prompts`, {
    method: 'POST',
    body: JSON.stringify({ title, content })
  });
  await loadFolders();
}

async function loadPrinciples() {
  const data = await fetchJSON('/api/principles');
  state.principles = data.principles;
  elements.principlesInput.value = state.principles.join('\n');
}

async function savePrinciples(principles) {
  await fetchJSON('/api/principles', {
    method: 'POST',
    body: JSON.stringify({ principles })
  });
  state.principles = principles.split('\n').filter(p => p.trim());
}

// ============= SESSION MANAGEMENT =============

async function selectSession(id) {
  state.currentSessionId = id;
  
  // Update UI
  hideEmptyState();
  showChatUI();
  
  // Load session messages
  const session = await loadSession(id);
  elements.chatTitle.textContent = session.title;
  renderMessages(session.messages);
  
  // Update active state in sidebar
  document.querySelectorAll('.session-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });
  
  // Focus input
  elements.messageInput.focus();
  
  // Close mobile sidebar
  if (window.innerWidth <= 768) {
    closeSidebar();
  }
}

function showEmptyState() {
  elements.emptyState.style.display = 'flex';
  elements.chatHeader.style.display = 'none';
  elements.messagesContainer.style.display = 'none';
  elements.inputContainer.style.display = 'none';
}

function hideEmptyState() {
  elements.emptyState.style.display = 'none';
}

function showChatUI() {
  elements.chatHeader.style.display = 'flex';
  elements.messagesContainer.style.display = 'block';
  elements.inputContainer.style.display = 'block';
}

// ============= RENDERING =============

function renderSessionList() {
  const list = elements.sessionList;
  list.innerHTML = '';
  
  if (state.sessions.length === 0) {
    list.innerHTML = '<li class="empty-state">No chats yet</li>';
    return;
  }
  
  state.sessions.forEach(session => {
    const li = document.createElement('li');
    li.className = 'session-item';
    li.dataset.id = session.id;
    li.textContent = session.title;
    li.addEventListener('click', () => selectSession(session.id));
    if (session.id === state.currentSessionId) {
      li.classList.add('active');
    }
    list.appendChild(li);
  });
}

function renderFolderList() {
  const list = elements.folderList;
  list.innerHTML = '';
  
  if (state.folders.length === 0) {
    list.innerHTML = '<li class="empty-state">No folders yet</li>';
    return;
  }
  
  state.folders.forEach(folder => {
    const li = document.createElement('li');
    li.className = 'folder-item';
    
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('width', '16');
    icon.setAttribute('height', '16');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '2');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z');
    icon.appendChild(path);
    
    const name = document.createElement('span');
    name.textContent = folder.name;
    
    li.appendChild(icon);
    li.appendChild(name);
    
    // Add prompts if any
    if (folder.prompts && folder.prompts.length > 0) {
      const promptsList = document.createElement('ul');
      promptsList.className = 'folder-prompts';
      
      folder.prompts.forEach(prompt => {
        const promptLi = document.createElement('li');
        promptLi.className = 'prompt-item';
        promptLi.textContent = prompt.title;
        promptLi.title = prompt.content;
        promptLi.addEventListener('click', (e) => {
          e.stopPropagation();
          copyToClipboard(prompt.content);
          showToast('Prompt copied to clipboard!');
        });
        promptsList.appendChild(promptLi);
      });
      
      list.appendChild(li);
      list.appendChild(promptsList);
    } else {
      list.appendChild(li);
    }
  });
}

function renderMessages(messages) {
  const container = elements.messages;
  container.innerHTML = '';
  
  messages.forEach(msg => {
    const messageEl = createMessageElement(msg);
    container.appendChild(messageEl);
  });
  
  scrollToBottom();
}

function createMessageElement(message) {
  const div = document.createElement('div');
  div.className = `message ${message.role}`;
  div.dataset.id = message.id;
  
  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = message.role === 'user' ? 'U' : 'AI';
  
  // Content
  const content = document.createElement('div');
  content.className = 'message-content';
  
  const text = document.createElement('div');
  text.className = 'message-text';
  text.textContent = message.content;
  
  content.appendChild(text);
  
  // Actions for assistant messages
  if (message.role === 'assistant') {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-button';
    copyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    `;
    copyBtn.addEventListener('click', () => {
      copyToClipboard(message.content);
      showToast('Copied to clipboard!');
    });
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'message-action-button';
    saveBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      Save to Library
    `;
    saveBtn.addEventListener('click', () => openSavePromptModal(message.content));
    
    actions.appendChild(copyBtn);
    actions.appendChild(saveBtn);
    content.appendChild(actions);
  }
  
  div.appendChild(avatar);
  div.appendChild(content);
  
  return div;
}

function appendMessage(message) {
  const messageEl = createMessageElement(message);
  elements.messages.appendChild(messageEl);
  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
  });
}

function updateFolderSelect() {
  const select = elements.folderSelect;
  select.innerHTML = '<option value="">Select a folder...</option>';
  
  state.folders.forEach(folder => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.name;
    select.appendChild(option);
  });
}

// ============= MESSAGE SENDING =============

async function handleSendMessage(e) {
  e.preventDefault();
  
  const content = elements.messageInput.value.trim();
  if (!content || !state.currentSessionId) return;
  
  // Disable input
  elements.messageInput.disabled = true;
  elements.sendButton.disabled = true;
  
  // Create and render user message optimistically
  const userMessage = {
    id: 'temp-' + Date.now(),
    role: 'user',
    content,
    timestamp: new Date().toISOString()
  };
  appendMessage(userMessage);
  
  // Clear input
  elements.messageInput.value = '';
  resetTextareaHeight();
  
  try {
    // Send to API
    const response = await sendMessage(content);
    
    // Remove temp user message and add real ones
    const tempMsg = elements.messages.querySelector(`[data-id="${userMessage.id}"]`);
    if (tempMsg) tempMsg.remove();
    
    appendMessage(response.userMessage);
    appendMessage(response.assistantMessage);
    
    // Update session title if changed
    if (response.session.title) {
      elements.chatTitle.textContent = response.session.title;
      const sessionItem = elements.sessionList.querySelector(`[data-id="${response.session.id}"]`);
      if (sessionItem) {
        sessionItem.textContent = response.session.title;
      }
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    // Remove temp message on error
    const tempMsg = elements.messages.querySelector(`[data-id="${userMessage.id}"]`);
    if (tempMsg) tempMsg.remove();
  } finally {
    // Re-enable input
    elements.messageInput.disabled = false;
    elements.sendButton.disabled = false;
    elements.messageInput.focus();
  }
}

// ============= MODALS =============

function openModal(modalEl) {
  modalEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  modalEl.style.display = 'none';
  document.body.style.overflow = '';
}

function openSettingsModal() {
  openModal(elements.settingsModal);
}

function closeSettingsModal() {
  closeModal(elements.settingsModal);
}

async function saveSettingsModal() {
  const principles = elements.principlesInput.value;
  try {
    await savePrinciples(principles);
    closeSettingsModal();
    showToast('Principles saved!');
  } catch (err) {
    showToast('Error saving principles: ' + err.message, 'error');
  }
}

function openFolderModal() {
  elements.folderNameInput.value = '';
  openModal(elements.folderModal);
  elements.folderNameInput.focus();
}

function closeFolderModal() {
  closeModal(elements.folderModal);
}

async function saveFolderModal() {
  const name = elements.folderNameInput.value.trim();
  if (!name) {
    showToast('Please enter a folder name', 'error');
    return;
  }
  
  try {
    await createFolder(name);
    closeFolderModal();
    showToast('Folder created!');
  } catch (err) {
    showToast('Error creating folder: ' + err.message, 'error');
  }
}

function openSavePromptModal(content) {
  state.currentMessageToSave = content;
  elements.promptTitleInput.value = '';
  openModal(elements.savePromptModal);
}

function closeSavePromptModal() {
  state.currentMessageToSave = null;
  closeModal(elements.savePromptModal);
}

async function saveSavePromptModal() {
  const folderId = elements.folderSelect.value;
  const title = elements.promptTitleInput.value.trim();
  
  if (!folderId) {
    showToast('Please select a folder', 'error');
    return;
  }
  
  if (!state.currentMessageToSave) {
    showToast('No content to save', 'error');
    return;
  }
  
  try {
    await savePromptToFolder(
      folderId,
      title || state.currentMessageToSave.slice(0, 50),
      state.currentMessageToSave
    );
    closeSavePromptModal();
    showToast('Prompt saved to library!');
  } catch (err) {
    showToast('Error saving prompt: ' + err.message, 'error');
  }
}

// ============= SIDEBAR MOBILE =============

function openSidebar() {
  elements.sidebar.classList.add('open');
  state.isSidebarOpen = true;
}

function closeSidebar() {
  elements.sidebar.classList.remove('open');
  state.isSidebarOpen = false;
}

function toggleSidebar() {
  if (state.isSidebarOpen) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

// ============= UTILITIES =============

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Copy failed:', err);
  });
}

function showToast(message, type = 'success') {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: ${type === 'error' ? '#ef4444' : '#10b981'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function resetTextareaHeight() {
  elements.messageInput.style.height = 'auto';
}

function autoResizeTextarea() {
  elements.messageInput.style.height = 'auto';
  elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px';
}

// ============= EVENT LISTENERS =============

// New Chat
elements.newChatButton.addEventListener('click', createSession);
elements.emptyNewChatButton.addEventListener('click', createSession);

// Message Form
elements.messageForm.addEventListener('submit', handleSendMessage);

// Textarea auto-resize and Enter key handling
elements.messageInput.addEventListener('input', autoResizeTextarea);
elements.messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    elements.messageForm.dispatchEvent(new Event('submit'));
  }
});

// Archive
elements.archiveButton.addEventListener('click', () => {
  if (state.currentSessionId) {
    if (confirm('Archive this chat?')) {
      archiveSession(state.currentSessionId);
    }
  }
});

// Settings Modal
elements.settingsButton.addEventListener('click', openSettingsModal);
elements.modalClose.addEventListener('click', closeSettingsModal);
elements.modalCancel.addEventListener('click', closeSettingsModal);
elements.modalSave.addEventListener('click', saveSettingsModal);

// Folder Modal
elements.addFolderButton.addEventListener('click', openFolderModal);
elements.folderModalClose.addEventListener('click', closeFolderModal);
elements.folderModalCancel.addEventListener('click', closeFolderModal);
elements.folderModalSave.addEventListener('click', saveFolderModal);

// Save Prompt Modal
elements.savePromptModalClose.addEventListener('click', closeSavePromptModal);
elements.savePromptModalCancel.addEventListener('click', closeSavePromptModal);
elements.savePromptModalSave.addEventListener('click', saveSavePromptModal);

// Mobile Menu
elements.mobileMenuButton.addEventListener('click', toggleSidebar);
elements.mobileClose.addEventListener('click', closeSidebar);

// Close modals on backdrop click
[elements.settingsModal, elements.folderModal, elements.savePromptModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });
});

// Close modals and sidebar on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (elements.settingsModal.style.display === 'flex') {
      closeSettingsModal();
    } else if (elements.folderModal.style.display === 'flex') {
      closeFolderModal();
    } else if (elements.savePromptModal.style.display === 'flex') {
      closeSavePromptModal();
    } else if (state.isSidebarOpen && window.innerWidth <= 768) {
      closeSidebar();
    }
  }
});

// ============= INITIALIZATION =============

async function init() {
  try {
    // Load all data
    await Promise.all([
      loadSessions(),
      loadFolders(),
      loadPrinciples()
    ]);
    
    // Show empty state initially
    showEmptyState();
    
    // Auto-select most recent session if exists
    if (state.sessions.length > 0) {
      await selectSession(state.sessions[0].id);
    }
  } catch (err) {
    console.error('Initialization error:', err);
    showToast('Failed to load data: ' + err.message, 'error');
  }
}

// CSS for toast animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Start app
init();
