// --- 1. DATA STORAGE ---
let mediaStorage = {
    session: "Live Session " + new Date().toLocaleDateString(),
    files: []
};

// --- 2. ELEMENTS ---
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle-btn');
const sidebarFileInput = document.getElementById('sidebar-file-upload');
const uploadStatus = document.getElementById('upload-status');
const fileNameSidebar = document.getElementById('file-name-sidebar');
const uploadProgress = document.getElementById('upload-progress');
const fileListContainer = document.getElementById('file-list-container');

// Player Elements
const mainVideo = document.getElementById('main-video');
const playerPlaceholder = document.getElementById('player-placeholder');
const videoTitleDisplay = document.querySelector('.video-title');

// --- 3. SIDEBAR TOGGLE ---
toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

// --- 4. UPLOAD LOGIC ---
sidebarFileInput.addEventListener('change', async function () {
    if (this.files && this.files[0]) {
        const file = this.files[0];

        // --- CHECK IF FILE ALREADY EXISTS IN STORAGE (By Name) ---
        let existingFile = mediaStorage.files.find(f => f.name === file.name);
        let savedFile;

        if (existingFile) {
            savedFile = existingFile;
            // Update URL in case it's a new session
            savedFile.url = URL.createObjectURL(file);
        } else {
            savedFile = addFileToMediaStorage(file);
        }

        fileNameSidebar.textContent = file.name;
        uploadStatus.style.display = 'block';
        uploadProgress.style.width = '30%';

        // --- SELECTIVE RESET ---
        transcriptOutput.innerHTML = "";
        chatMessages.innerHTML = "";
        unansweredList.innerHTML = `<div class="chat-item"><div class="chat-content"><p style="color: #666; font-style: italic;">Questions marked for the speaker will appear here...</p></div></div>`;
        unansweredCount = 0;
        activeStreams = {};

        // Clear Tiny Inbox
        const inboxContent = document.getElementById('inbox-content');
        const inboxBadge = document.querySelector('.envelope-icon-wrapper .badge');
        if (inboxContent) {
            inboxContent.innerHTML = '<p class="empty-msg">Waiting for answers...</p>';
        }
        if (inboxBadge) {
            inboxBadge.textContent = '0';
            inboxBadge.style.display = 'none';
        }

        // Restore Context (Comments & Inquiries)
        playMedia(savedFile);
        renderMediaStorage();

        // 2. Upload to Backend
        const formData = new FormData();
        formData.append('file', file);

        try {
            uploadProgress.style.width = '60%';
            transcriptToggle.checked = true;
            transcriptBox.style.display = 'block';
            transcriptOutput.innerHTML = `<em>[Initializing Gemini Session for ${file.name}...]</em><br>`;

            const response = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            uploadProgress.style.width = '100%';
            setTimeout(() => { uploadStatus.style.display = 'none'; }, 1000);

            if (data.status === 'processing') {
                const statusSpan = document.createElement('div');
                statusSpan.className = "processing-indicator";
                statusSpan.style.cssText = "color: #f39c12; font-style: italic; margin: 10px 0; padding: 5px; border-left: 3px solid #f39c12;";
                statusSpan.innerHTML = `⚙️ Lumina engine is analyzing "${file.name}"... insights will appear live.`;
                transcriptOutput.appendChild(statusSpan);
            }
        } catch (error) {
            console.error('Error:', error);
            uploadProgress.style.backgroundColor = '#e74c3c';
        }
    }
});

function renderMediaStorage() {
    fileListContainer.innerHTML = '';
    mediaStorage.files.forEach(renderMediaItem);
}

// --- 5. DATA & PLAYER FUNCTIONS ---

function addFileToMediaStorage(file) {
    const fileEntry = {
        id: "media-" + Date.now(),
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file), // This is the temporary path to your file
        uploadedAt: new Date().toISOString()
    };
    mediaStorage.files.push(fileEntry);
    return fileEntry;
}

function renderMediaItem(fileData) {
    const item = document.createElement('div');
    item.style.cssText = "display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px; border-radius: 6px; transition: 0.2s;";
    const iconClass = fileData.type.includes('video') ? 'fa-play-circle' : 'fa-music';

    item.innerHTML = `
        <i class="fas ${iconClass}" style="color: #4A90E2;"></i>
        <span style="font-size: 0.8rem; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fileData.name}</span>
    `;

    // RUN MEDIA INSIDE PLAYER
    item.onclick = () => {
        playMedia(fileData);
    };

    item.onmouseover = () => { item.style.background = "#eef2f7"; };
    item.onmouseout = () => { item.style.background = "transparent"; };
    fileListContainer.prepend(item);
}

let currentMediaId = null;

function playMedia(fileData) {
    currentMediaId = fileData.id;

    // 1. Show the video element, hide the placeholder
    mainVideo.style.display = "block";
    playerPlaceholder.style.display = "none";

    // 2. Set the source and the title
    mainVideo.src = fileData.url;
    videoTitleDisplay.textContent = fileData.name;

    // 3. Play the video
    mainVideo.play();

    // 4. RESTORE COMMENTS & INQUIRIES FOR THIS MEDIA
    restoreMediaSpecificContext(fileData.id);

    console.log("Now playing:", fileData.name);
}

function restoreMediaSpecificContext(mediaId) {
    const file = mediaStorage.files.find(f => f.id === mediaId);
    if (!file) return;

    // Restore Comments
    const header = commentsList.querySelector('.comments-header');
    // Clear current comments (except header)
    const existingComments = commentsList.querySelectorAll('.comment-item');
    existingComments.forEach(c => c.remove());

    if (file.comments) {
        file.comments.forEach(c => renderStoredComment(c));
    }

    // Restore inquiries
    const inquiries = file.inquiries || [];
    activeDisplay.innerHTML = '';
    if (inquiries.length === 0) {
        activeDisplay.innerHTML = `
            <div class="active-welcome" id="active-welcome-msg">
                <i class="fas fa-layer-group" style="font-size: 1.5rem; margin-bottom: 10px; color: #94a3b8;"></i>
                <p style="font-size: 0.9rem; color: #64748b;">Knowledge layer is clear.<br>Ask a question to begin research.</p>
            </div>`;

        // Check if user is already typing (focused OR has value); if so, hide it immediately
        if (
            (activeQueryInput && (document.activeElement === activeQueryInput || activeQueryInput.value.length > 0)) ||
            (historySearchInput && (document.activeElement === historySearchInput || historySearchInput.value.length > 0))
        ) {
            hideWelcome();
        }
    } else {
        inquiries.forEach(inq => appendStoredInquiry(inq));
    }
}

function renderStoredComment(c) {
    const commentItem = document.createElement('div');
    commentItem.className = 'comment-item';
    commentItem.innerHTML = `
        <div class="avatar user-2">M</div>
        <div class="comment-content">
            <div class="comment-meta">
                <span class="username">Me</span>
                <span class="timestamp">${c.time}</span>
            </div>
            <p class="comment-text">${c.text}</p>
        </div>
    `;
    const header = commentsList.querySelector('.comments-header');
    header.insertAdjacentElement('afterend', commentItem);
}

function appendStoredInquiry(inq) {
    const responseDiv = document.createElement('div');
    responseDiv.className = 'active-response';
    responseDiv.style.borderBottom = "1px solid #edf2f7";
    responseDiv.style.paddingBottom = "15px";
    responseDiv.innerHTML = `
        <span class="query-label">Inquiry: ${inq.query}</span>
        <div class="answer-body">${formatActiveResponse(inq.answer)}</div>
    `;
    activeDisplay.appendChild(responseDiv);
}

function cancelUpload() {
    sidebarFileInput.value = '';
    uploadStatus.style.display = 'none';
}


// Ensure you have added the Socket.io script tag in your HTML!
const socket = io(window.location.origin);
const transcriptToggle = document.getElementById('transcriptToggle');
const transcriptBox = document.getElementById('live-transcript-box'); // The ID from your HTML
const transcriptOutput = document.getElementById('transcript-output');

socket.on('connect', () => {
    console.log("Socket connected successfully. ID:", socket.id);
});

// Expert Monitor: Log every time the server talks to us
socket.onAny((eventName, ...args) => {
    console.log(`[Socket Monitor] Incoming Event: ${eventName}`, args);
});

socket.on('connect_error', (err) => {
    console.error("Socket connection failed:", err);
});

// Handle the switch
transcriptToggle.addEventListener('change', () => {
    transcriptBox.style.display = transcriptToggle.checked ? 'block' : 'none';
});

// --- STREAMING TRANSCRIPT HANDLER ---
let activeStreams = {};

socket.on('new_transcript', (data) => {
    // Auto-open UI
    transcriptToggle.checked = true;
    transcriptBox.style.display = 'block';

    // Remove processing indicators
    if (data.text.includes('--- Upload Result') || data.is_stream) {
        const indicators = transcriptOutput.querySelectorAll('.processing-indicator');
        indicators.forEach(el => el.remove());
    }

    let targetDiv;
    if (data.is_stream && data.chunk && activeStreams[data.stream_id]) {
        targetDiv = activeStreams[data.stream_id];
    } else {
        targetDiv = document.createElement('div');
        targetDiv.style.cssText = "white-space: pre-wrap; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 10px; color: #fff; font-family: inherit; font-size: 0.95rem; line-height: 1.6;";
        transcriptOutput.appendChild(targetDiv);
        if (data.is_stream) activeStreams[data.stream_id] = targetDiv;
    }

    // Sanitize, Highlight Antigravity, and Style Timestamps
    const cleanText = data.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let processedText = cleanText.replace(/Antigravity/gi, '<span class="antigravity-glow">$&</span>');

    // Pattern for [00:00] or [0:00] timestamps
    processedText = processedText.replace(/\[\d{1,2}:\d{2}\]/g, '<span class="timestamp">$&</span>');

    if (data.chunk) {
        targetDiv.innerHTML += processedText;
    } else {
        targetDiv.innerHTML = processedText;
    }
    transcriptBox.scrollTop = transcriptBox.scrollHeight;
});

// --- 6. LUMINA LIVE LAYER 2: INTERACTION SYSTEM ---
const askInput = document.querySelector('.ask-input');
const chatMessages = document.querySelector('.chat-messages');
const unansweredList = document.getElementById('unanswered-list');
const inboxBadge = document.querySelector('.envelope-icon-wrapper .badge');

let unansweredCount = 0;

// Listen for Enter key on the Ask Bar
let isSubmitting = false;
if (askInput) {
    askInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && askInput.value.trim() && !isSubmitting) {
            isSubmitting = true;
            const text = askInput.value.trim();
            socket.emit('submit_question', { text: text, user: "Me" });
            askInput.value = '';

            // Debounce for 2 seconds
            askInput.disabled = true;
            askInput.placeholder = "Processing...";
            setTimeout(() => {
                isSubmitting = false;
                askInput.disabled = false;
                askInput.placeholder = "Ask a question about this session...";
            }, 2000);
        }
    });
}

// Socket: New question acknowledge
socket.on('question_received', (q) => {
    renderQuestion(q);
});

// Socket: Status updates (Classification or Speaker Queue)
socket.on('question_status_update', (data) => {
    const qEl = document.getElementById(`q-${data.q_id}`);
    if (qEl) {
        const statusBadge = qEl.querySelector('.status-badge');
        const questionText = qEl.querySelector('p').textContent;
        const statusLabel = {
            'unanswered': 'EXPERT CLARIFICATION PENDING',
            'nonsense': 'UNCLEAR INPUT',
            'off_topic': 'UNRELATED TO TOPIC',
            'answered': 'ANSWER FOUND',
            'relevant': 'ANALYZING...'
        }[data.status] || data.status.toUpperCase();

        statusBadge.textContent = statusLabel;
        statusBadge.className = `status-badge badge-${data.status}`;

        if (data.status === 'unanswered') {
            addToUnansweredList(data.q_id);
            addToTinyInbox(data.q_id, questionText, "The AI couldn't find a factual answer yet. The session creator will address this shortly.", "status-unanswered");
            updateInboxCount();
        } else if (data.status === 'nonsense') {
            addToTinyInbox(data.q_id, questionText, "Lumina couldn't process this. Please try asking a specific question.", "status-nonsense");
            updateInboxCount();
            removeFromUnansweredList(data.q_id);
        } else if (data.status === 'off_topic') {
            addToTinyInbox(data.q_id, questionText, "This seems outside the scope of the current session discussion.", "status-off-topic");
            updateInboxCount();
            removeFromUnansweredList(data.q_id);
        } else if (data.status === 'answered') {
            removeFromUnansweredList(data.q_id);
        }
    }
});

const envelopeBtn = document.getElementById('envelope-btn');
const tinyInbox = document.getElementById('tiny-inbox');
const inboxContent = document.getElementById('inbox-content');

// Toggle Inbox Display
if (envelopeBtn) {
    envelopeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Avoid accidental closing
        tinyInbox.classList.toggle('inbox-hidden');

        // Reset badge when viewing
        if (!tinyInbox.classList.contains('inbox-hidden')) {
            inboxBadge.textContent = '0';
            inboxBadge.style.display = 'none';
        }
    });
}

// Close inbox if clicking outside
document.addEventListener('click', () => {
    if (tinyInbox && !tinyInbox.classList.contains('inbox-hidden')) {
        tinyInbox.classList.add('inbox-hidden');
    }
});

// Socket: Extract result arrived
socket.on('new_answer', (data) => {
    const qEl = document.getElementById(`q-${data.q_id}`);
    if (qEl) {
        let answerEl = qEl.querySelector('.answer-text');
        if (!answerEl) {
            answerEl = document.createElement('div');
            answerEl.className = 'answer-text';
            qEl.querySelector('.chat-content').appendChild(answerEl);
        }
        const formattedAnswer = formatActiveResponse(data.answer);
        answerEl.innerHTML = `<strong>Lumina AI:</strong> ${formattedAnswer}`;

        // --- ADD TO TINY INBOX ---
        addToTinyInbox(data.q_id, qEl.querySelector('p').textContent, formattedAnswer);

        // Sync inbox badge count
        updateInboxCount();
    }
});

function renderQuestion(q) {
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.id = `q-${q.id}`;
    div.innerHTML = `
        <div class="avatar user-3" style="background: #2c3e50;">M</div>
        <div class="chat-content">
            <div class="chat-meta">
                <span class="username">${q.user}</span>
                <span class="status-badge badge-pending">CLASSIFYING...</span>
            </div>
            <p>${q.text}</p>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addToUnansweredList(q_id) {
    const q = document.getElementById(`q-${q_id}`);
    if (!q || document.getElementById(`un-q-${q_id}`)) return;

    // Clear placeholder placeholder if this is the first item
    if (unansweredCount === 0) unansweredList.innerHTML = '';

    const item = document.createElement('div');
    item.className = 'chat-item unanswered-item';
    item.id = `un-q-${q_id}`;
    item.innerHTML = `
        <div class="chat-content">
            <p style="font-size: 0.85rem; margin: 0; color: #2c3e50;">${q.querySelector('p').textContent}</p>
            <span style="font-size: 0.65rem; color: #e74c3c; font-weight: bold;">Awaiting Speaker...</span>
        </div>
    `;
    unansweredList.appendChild(item);
    unansweredCount++;
}

function removeFromUnansweredList(q_id) {
    const item = document.getElementById(`un-q-${q_id}`);
    if (item) {
        item.remove();
        unansweredCount--;
        if (unansweredCount === 0) {
            unansweredList.innerHTML = `
                <div class="chat-item">
                    <div class="chat-content">
                        <p style="color: #666; font-style: italic;">Questions marked for the speaker will appear here...</p>
                    </div>
                </div>`;
        }
    }
}

function addToTinyInbox(q_id, question, answer, typeClass = "") {
    // Remove placeholder if it's the first message
    const emptyMsg = inboxContent.querySelector('.empty-msg');
    if (emptyMsg) emptyMsg.remove();

    const div = document.createElement('div');
    div.className = `inbox-item ${typeClass}`;
    div.innerHTML = `
        <span class="q-preview">Q: ${question.substring(0, 40)}...</span>
        <p class="a-text">${answer}</p>
    `;
    inboxContent.prepend(div);
}

function updateInboxCount() {
    if (inboxBadge && (tinyInbox.classList.contains('inbox-hidden') || tinyInbox.style.display === 'none')) {
        let current = parseInt(inboxBadge.textContent) || 0;
        inboxBadge.textContent = current + 1;
        inboxBadge.style.display = 'block';
    }
}

// --- 7. LAYER 3: LUMINA AI ACTIVE (INTELLIGENCE LAYER) ---
const activeQueryInput = document.getElementById('active-query-input');
const activeQueryBtn = document.getElementById('active-query-btn');
const activeDisplay = document.getElementById('active-display');
const activeLayerPanel = document.getElementById('active-layer-panel');
const activeLayerToggle = document.getElementById('active-layer-toggle');

// --- SEARCH BAR TOGGLE (Mockup Version) ---
const masterToggleClick = document.getElementById('master-toggle-click');
const searchWrapper = document.getElementById('history-search-wrapper');
const searchPill = document.getElementById('search-pill');
const historySearchInput = document.getElementById('active-history-search');

if (masterToggleClick && searchWrapper) {
    masterToggleClick.addEventListener('click', () => {
        masterToggleClick.classList.toggle('active');
        const isActive = masterToggleClick.classList.contains('active');

        if (isActive) {
            searchWrapper.style.display = 'flex';
            setTimeout(() => {
                searchWrapper.style.opacity = '1';
                searchWrapper.style.pointerEvents = 'all';
            }, 10);
        } else {
            searchWrapper.style.opacity = '0';
            searchWrapper.style.pointerEvents = 'none';
            setTimeout(() => {
                searchWrapper.style.display = 'none';
            }, 300);
        }
    });
}


// Toggle Active Panel visibility
if (activeLayerToggle && activeLayerPanel) {
    activeLayerToggle.addEventListener('click', () => {
        const isHidden = activeLayerPanel.style.display === 'none';
        activeLayerPanel.style.display = isHidden ? 'block' : 'none';

        // Add a subtle "Active" Glow to the pill when open
        if (!isHidden) {
            activeLayerToggle.style.boxShadow = "none";
            activeLayerToggle.style.background = "";
        } else {
            activeLayerToggle.style.boxShadow = "0 0 15px rgba(74, 144, 226, 0.4)";
            activeLayerToggle.style.background = "#fff";
        }
    });
}

// --- LAYER 3 SEARCH LOGIC ---
const activeHistorySearch = document.getElementById('active-history-search');

if (activeHistorySearch) {
    activeHistorySearch.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();

        // If empty, restore current video context
        if (!term) {
            restoreMediaSpecificContext(currentMediaId);
            return;
        }

        // --- GLOBAL CHAT HISTORY SEARCH ---
        activeDisplay.innerHTML = `
            <div class="history-header">
                <i class="fas fa-search"></i> Searching chat history for: "${e.target.value}"
            </div>
        `;

        let resultsFound = 0;

        // Search through ALL files in storage
        mediaStorage.files.forEach(file => {
            const fileInquiries = file.inquiries || [];

            fileInquiries.forEach(inq => {
                // Search in both question AND answer (case-insensitive)
                const queryMatch = inq.query.toLowerCase().includes(term);
                const answerMatch = inq.answer.toLowerCase().includes(term);

                if (queryMatch || answerMatch) {
                    const resDiv = document.createElement('div');
                    resDiv.className = 'active-response history-match';
                    resDiv.style.borderLeft = '3px solid #4A90E2';
                    resDiv.style.marginBottom = '15px';

                    resDiv.innerHTML = `
                        <div class="history-meta" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span class="history-source" style="font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-video"></i> ${file.name}
                            </span>
                            <span style="font-size: 0.7rem; color: #94a3b8;">
                                ${queryMatch ? '<i class="fas fa-question-circle"></i> Question' : '<i class="fas fa-comment-dots"></i> Answer'}
                            </span>
                        </div>
                        <span class="query-label">You asked: ${inq.query}</span>
                        <div class="answer-body">${formatActiveResponse(inq.answer)}</div>
                    `;
                    activeDisplay.appendChild(resDiv);
                    resultsFound++;
                }
            });
        });

        // Show empty state if no results
        if (resultsFound === 0) {
            activeDisplay.innerHTML += `
                <div class="empty-msg" style="text-align: center; padding: 40px 20px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.3;"></i>
                    <p>No chat history found for "<strong>${e.target.value}</strong>"</p>
                    <p style="font-size: 0.85rem; margin-top: 10px;">Try searching for keywords from your previous questions or answers.</p>
                </div>
            `;
        } else {
            // Add result count header
            const countBadge = document.createElement('div');
            countBadge.style.cssText = 'text-align: center; padding: 10px; background: #f1f5f9; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; color: #475569;';
            countBadge.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> Found <strong>${resultsFound}</strong> result${resultsFound > 1 ? 's' : ''} across your library`;
            activeDisplay.insertBefore(countBadge, activeDisplay.children[1]);
        }
    });
}

function resetActiveFilter() {
    activeDisplay.querySelectorAll('.active-response').forEach(r => r.style.display = 'block');
}

function submitActiveQuery() {
    const query = activeQueryInput.value.trim();
    if (!query) return;

    // --- GATHER COMMENTS FOR CONTEXT ---
    const commentEls = document.querySelectorAll('.comment-text');
    let commentsContext = "";
    commentEls.forEach((el, index) => {
        commentsContext += `[Comment ${index + 1}]: ${el.textContent}\n`;
    });

    const thinkingId = `thinking-${Date.now()}`;
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'active-response';
    thinkingDiv.id = thinkingId;
    thinkingDiv.innerHTML = `
        <span class="query-label">Searching Transcript & Comments...</span>
        <p class="answer-body" style="color: #94a3b8; font-style: italic;">Lumina is analyzing the session for "${query}"...</p>
    `;
    activeDisplay.appendChild(thinkingDiv);
    activeDisplay.scrollTop = activeDisplay.scrollHeight;

    socket.emit('active_query', {
        query: query,
        thinkingId: thinkingId,
        comments: commentsContext || "No comments yet."
    });
    activeQueryInput.value = '';
}


// Helper to hide the welcome message
function hideWelcome() {
    const msg = document.getElementById('active-welcome-msg');
    if (msg) msg.style.display = 'none';
}

if (activeQueryBtn) {
    activeQueryBtn.addEventListener('click', () => {
        hideWelcome();
        submitActiveQuery();
    });
}

// GLOBAL EVENT DELEGATION: Hide Welcome on any search interaction
document.addEventListener('focusin', (e) => {
    if (e.target.id === 'active-query-input' || e.target.id === 'active-history-search') {
        hideWelcome();
    }
});
document.addEventListener('input', (e) => {
    if (e.target.id === 'active-query-input' || e.target.id === 'active-history-search') {
        hideWelcome();
    }
});

if (activeQueryInput) {
    activeQueryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            hideWelcome();
            submitActiveQuery();
        }
    });
}

socket.on('active_response', (data) => {
    // Replace thinking state with actual answer
    const thinkingDiv = document.getElementById(data.thinkingId);
    if (thinkingDiv) {
        thinkingDiv.innerHTML = `
            <span class="query-label">Inquiry: ${data.query}</span>
            <div class="answer-body">${formatActiveResponse(data.answer)}</div>
        `;
    } else {
        // Fallback if thinkingDiv not found (e.g., page refresh or error)
        const newResponseDiv = document.createElement('div');
        newResponseDiv.className = 'active-response';
        newResponseDiv.innerHTML = `
            <span class="query-label">Inquiry: ${data.query}</span>
            <div class="answer-body">${formatActiveResponse(data.answer)}</div>
        `;
        activeDisplay.appendChild(newResponseDiv);
    }
    activeDisplay.scrollTop = activeDisplay.scrollHeight;

    // 3. Save to storage for persistence (Expert check: avoid duplicates)
    if (currentMediaId) {
        const file = mediaStorage.files.find(f => f.id === currentMediaId);
        if (file) {
            if (!file.inquiries) file.inquiries = [];
            // Only add if not already there (prevents dups on reconnects)
            const exists = file.inquiries.some(inq => inq.query === data.query && inq.answer === data.answer);
            if (!exists) {
                file.inquiries.push({ query: data.query, answer: data.answer });
            }
        }
    }
});

function formatActiveResponse(text) {
    // Auto-link timestamps if found in [MM:SS] format
    return text.replace(/\[(\d{1,2}:\d{2})\]/g, (match, time) => {
        return `<a href="#" class="timestamp-link" onclick="seekTo('${time}'); return false;">${match}</a>`;
    });
}

function seekTo(timeStr) {
    // Helper to jump video to timestamp
    const parts = timeStr.split(':');
    if (parts.length === 2) {
        const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        if (mainVideo) {
            mainVideo.currentTime = seconds;
            mainVideo.play();
        }
    }
}

// --- 8. COMMENT FUNCTIONALITY ---
const commentInput = document.getElementById('comment-input');
const commentBtn = document.getElementById('comment-btn');
const commentsList = document.getElementById('comments-list');

function addComment() {
    const text = commentInput.value.trim();
    if (!text) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const commentItem = document.createElement('div');
    commentItem.className = 'comment-item';
    commentItem.style.animation = "fadeInTranscript 0.5s ease forwards";
    commentItem.innerHTML = `
        <div class="avatar user-2">M</div>
        <div class="comment-content">
            <div class="comment-meta">
                <span class="username">Me</span>
                <span class="timestamp">${timeStr}</span>
            </div>
            <p class="comment-text">${text}</p>
        </div>
    `;

    // Insert after the header
    const header = commentsList.querySelector('.comments-header');
    header.insertAdjacentElement('afterend', commentItem);

    // Save to storage
    if (currentMediaId) {
        const file = mediaStorage.files.find(f => f.id === currentMediaId);
        if (file) {
            if (!file.comments) file.comments = [];
            file.comments.push({ text: text, time: timeStr });
        }
    }

    commentInput.value = '';
}

if (commentBtn) {
    commentBtn.addEventListener('click', addComment);
}

if (commentInput) {
    commentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addComment();
    });
}

// --- 9. LAYER 4: LUMINA CREATOR INSIGHT ENGINE ---
const navDashboard = document.getElementById('nav-dashboard');
const navAnalytics = document.getElementById('nav-analytics');
const analyticsModal = document.getElementById('analytics-modal');
const analyticsBody = document.getElementById('analytics-body');

function openAnalytics() {
    analyticsModal.style.display = 'flex';
    analyticsBody.innerHTML = `
        <div class="loading-engine">
            <i class="fas fa-cog fa-spin"></i>
            <p>Lumina Engine is synthesizing 4 layers of data... please wait.</p>
        </div>
    `;

    // Gather session context
    const commentEls = document.querySelectorAll('.comment-text');
    let commentsContext = "";
    commentEls.forEach((el, index) => {
        commentsContext += `[Comment ${index + 1}]: ${el.textContent}\n`;
    });

    socket.emit('generate_insights', { comments: commentsContext });
}

function closeAnalytics() {
    analyticsModal.style.display = 'none';
}

if (navDashboard) navDashboard.addEventListener('click', (e) => { e.preventDefault(); openAnalytics(); });

socket.on('creator_insights_data', (data) => {
    if (data.error) {
        analyticsBody.innerHTML = `<div class="empty-msg" style="color: #e74c3c;">${data.error}</div>`;
        return;
    }

    const overview = data.session_overview;
    const sentiment = data.sentiment_summary;

    analyticsBody.innerHTML = `
        <!-- High Level Stats -->
        <div class="insight-grid">
            <div class="insight-card">
                <h3>Engagement</h3>
                <div class="value" style="color: #4A90E2;">${overview.engagement_level.toUpperCase()}</div>
            </div>
            <div class="insight-card">
                <h3>Clearance Rate</h3>
                <div class="value">${Math.round((overview.relevant_answered / (overview.relevant_asked || 1)) * 100)}%</div>
            </div>
            <div class="insight-card">
                <h3>Vibe</h3>
                <div class="value" style="font-size: 0.9rem; font-weight: 600;">"${sentiment.audience_vibe}"</div>
            </div>
        </div>

        <!-- Detailed Question Stats -->
        <div class="feedback-section">
            <h4><i class="fas fa-list-ol" style="color: #4A90E2;"></i> Question Pipeline Analysis</h4>
            <div class="insight-grid" style="grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px;">
                <div class="insight-card" style="padding: 10px;">
                    <h3 style="font-size: 0.6rem;">Relevant</h3>
                    <div class="value" style="font-size: 1.1rem;">${overview.relevant_asked}</div>
                </div>
                <div class="insight-card" style="padding: 10px; border-bottom: 3px solid #2ecc71;">
                    <h3 style="font-size: 0.6rem;">Answered</h3>
                    <div class="value" style="font-size: 1.1rem; color: #2ecc71;">${overview.relevant_answered}</div>
                </div>
                <div class="insight-card" style="padding: 10px; border-bottom: 3px solid #e74c3c;">
                    <h3 style="font-size: 0.6rem;">Speaker Q</h3>
                    <div class="value" style="font-size: 1.1rem; color: #e74c3c;">${overview.relevant_unanswered}</div>
                </div>
                <div class="insight-card" style="padding: 10px; background: #f1f5f9;">
                    <h3 style="font-size: 0.6rem;">Off-Topic</h3>
                    <div class="value" style="font-size: 1.1rem; color: #64748b;">${overview.off_topic_asked}</div>
                </div>
            </div>
        </div>

        <div class="feedback-section">
            <h4><i class="fas fa-bullseye" style="color: #e67e22;"></i> Top Interest Topics</h4>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
                ${data.top_interest_topics.map(t => `<span class="active-badge" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; text-transform: none;">${t}</span>`).join('')}
            </div>
        </div>

        <div class="feedback-section">
            <h4><i class="fas fa-smile-beam" style="color: #f1c40f;"></i> Audience Sentiment</h4>
            <div style="display: flex; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 10px;">
                <div style="width: ${sentiment.positive_percent}%; background: #2ecc71;"></div>
                <div style="width: ${sentiment.neutral_percent}%; background: #94a3b8;"></div>
                <div style="width: ${sentiment.negative_percent}%; background: #e74c3c;"></div>
            </div>
            <p style="font-size: 0.8rem; color: #64748b; text-align: center;">
                ${sentiment.positive_percent}% Positive | ${sentiment.neutral_percent}% Neutral | ${sentiment.negative_percent}% Negative
            </p>
        </div>

        <div class="feedback-section">
            <h4><i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i> Clarity Gaps & Misunderstandings</h4>
            <div class="feedback-list" style="background: none; padding: 0;">
                ${data.clarity_gaps.map(g => `
                    <div style="background: #fff5f5; border-left: 4px solid #e74c3c; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                        <div style="font-weight: 700; color: #c53030; margin-bottom: 4px;">Topic: ${g.topic}</div>
                        <div style="font-size: 0.8rem; font-style: italic; color: #718096;">Evidence: "${g.evidence}"</div>
                    </div>
                `).join('') || '<div class="insight-card">No significant gaps detected. Great delivery!</div>'}
            </div>
        </div>

        <div class="feedback-section">
            <h4><i class="fas fa-lightbulb" style="color: #2ecc71;"></i> Improvement Suggestions</h4>
            <ul class="feedback-list">
                ${data.delivery_improvement_suggestions.map(s => `<li>${s}</li>`).join('')}
            </ul>
        </div>
        
        <div class="feedback-section" style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #cbd5e1;">
            <p style="font-size: 0.75rem; color: #94a3b8; font-style: italic;">
                * Lumina Creator Engine analysis complete. Based on Transcript + ${overview.total_questions} Questions + Audience Comments.
            </p>
        </div>
    `;
});
