const API_URL = "http://localhost:8000";
let currentFile = null;
let cameraStream = null;
let autoSpeakEnabled = false;
let currentUtterance = null;
let recognition = null;
let isRecording = false;

// ============================================================
// CHAT HISTORY
// ============================================================
function getUser() { return localStorage.getItem("studymate_user") || "Guest"; }
function getHistoryKey() { return `studymate_history_${getUser()}`; }
function loadHistory() {
    try { return JSON.parse(localStorage.getItem(getHistoryKey())) || []; }
    catch { return []; }
}
function saveMessage(role, text, fileInfo = null) {
    const history = loadHistory();
    history.push({ role, text, fileInfo: fileInfo ? { name: fileInfo.name, type: fileInfo.type } : null, timestamp: new Date().toISOString() });
    if (history.length > 200) history.splice(0, history.length - 200);
    localStorage.setItem(getHistoryKey(), JSON.stringify(history));
    updateHistorySidebar();
}
function clearHistoryStorage() {
    localStorage.removeItem(getHistoryKey());
    updateHistorySidebar();
}
function groupByDate(history) {
    const groups = {};
    history.forEach(msg => {
        if (msg.role !== "user") return;
        const date = new Date(msg.timestamp);
        const key = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        if (!groups[key]) groups[key] = [];
        groups[key].push(msg);
    });
    return groups;
}
function updateHistorySidebar() {
    const sidebar = document.getElementById("historySidebar");
    if (!sidebar) return;
    const history = loadHistory();
    const userMsgs = history.filter(m => m.role === "user").reverse();
    if (userMsgs.length === 0) { sidebar.innerHTML = '<p class="no-history-msg">No chats yet</p>'; return; }
    sidebar.innerHTML = userMsgs.slice(0, 20).map(msg => `
        <div class="history-chat-item" onclick="loadHistoryMessage('${encodeURIComponent(msg.text.substring(0,100))}')">
            <span>${msg.text.substring(0, 38)}${msg.text.length > 38 ? "..." : ""}</span>
            <svg class="pin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
        </div>`).join("");
}
function loadHistoryMessage(encodedText) {
    const text = decodeURIComponent(encodedText);
    document.getElementById("userInput").value = text;
    autoResize(document.getElementById("userInput"));
    document.getElementById("userInput").focus();
}
function restoreChatFromHistory() {
    const history = loadHistory();
    if (history.length === 0) return;
    history.slice(-20).forEach(msg => {
        if (msg.fileInfo) {
            appendMessage((msg.fileInfo.type === "image" ? "🖼️ " : "📄 ") + msg.fileInfo.name + (msg.text ? "\n" + msg.text : ""), msg.role === "user" ? "user" : "bot");
        } else {
            appendMessage(msg.text, msg.role === "user" ? "user" : "bot");
        }
    });
    scrollToBottom();
}

// ============================================================
// VOICE INPUT
// ============================================================
function initVoiceRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "hi-IN";
    rec.onstart = () => {
        isRecording = true;
        document.getElementById("voiceBtn").classList.add("recording");
        const vs = document.getElementById("voiceStatus");
        if (vs) { vs.classList.add("show"); document.getElementById("voiceStatusText").textContent = "Sun rahi hoon... bolo! 🎤"; }
    };
    rec.onresult = (event) => {
        let interim = "", final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) final += t; else interim += t;
        }
        const input = document.getElementById("userInput");
        input.value = final || interim;
        autoResize(input);
        const vst = document.getElementById("voiceStatusText");
        if (vst) vst.textContent = interim ? `"${interim}"` : "Sun rahi hoon... 🎤";
    };
    rec.onend = () => {
        isRecording = false;
        document.getElementById("voiceBtn").classList.remove("recording");
        const vs = document.getElementById("voiceStatus");
        if (vs) vs.classList.remove("show");
        const input = document.getElementById("userInput");
        if (input.value.trim()) setTimeout(() => sendMessage(), 300);
    };
    rec.onerror = (e) => {
        isRecording = false;
        document.getElementById("voiceBtn").classList.remove("recording");
        const vs = document.getElementById("voiceStatus");
        if (vs) vs.classList.remove("show");
        if (e.error === "not-allowed") appendMessage("Microphone access nahi mila 😔 Browser settings mein allow karo!", "bot");
        else if (e.error === "no-speech") appendMessage("Koi awaaz nahi aayi! Dobara try karo 🎤", "bot");
    };
    return rec;
}
function toggleVoiceInput() {
    if (!recognition) recognition = initVoiceRecognition();
    if (!recognition) { alert("Chrome use karo voice ke liye! 😊"); return; }
    if (isRecording) recognition.stop();
    else { document.getElementById("userInput").value = ""; recognition.start(); }
}

// ============================================================
// VOICE OUTPUT
// ============================================================
function toggleAutoSpeak() {
    autoSpeakEnabled = !autoSpeakEnabled;
    const btn = document.getElementById("speakToggleBtn");
    if (autoSpeakEnabled) {
        btn.classList.add("speak-active");
        appendMessage("Voice mode ON! 🔊 Ab main bolke bhi jawab dungi!", "bot");
    } else {
        btn.classList.remove("speak-active");
        stopSpeaking();
    }
}
function speakText(text) {
    if (!autoSpeakEnabled) return;
    stopSpeaking();
    const clean = text.replace(/[\u{1F300}-\u{1FAD6}]/gu, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/<[^>]+>/g, "").trim();
    if (!clean) return;
    currentUtterance = new SpeechSynthesisUtterance(clean);
    currentUtterance.lang = "hi-IN";
    currentUtterance.rate = 0.95;
    currentUtterance.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang.includes("hi") && v.name.toLowerCase().includes("female")) || voices.find(v => v.lang.includes("hi")) || voices.find(v => v.name.toLowerCase().includes("female"));
    if (v) currentUtterance.voice = v;
    window.speechSynthesis.speak(currentUtterance);
}
function stopSpeaking() {
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
}

// ============================================================
// SEND MESSAGE
// ============================================================
async function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input.value.trim();
    if (currentFile) { await sendFileMessage(message || "Is file ko analyze karo"); return; }
    if (!message) return;

    appendMessage(message, "user");
    saveMessage("user", message);
    input.value = "";
    autoResize(input);

    const sendBtn = document.getElementById("sendBtn");
    sendBtn.disabled = true;
    const typingId = showTyping();

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        removeTyping(typingId);
        appendMessage(data.response, "bot");
        saveMessage("bot", data.response);
        speakText(data.response);
    } catch (err) {
        removeTyping(typingId);
        appendMessage("Backend se connection nahi ho pa raha. Backend chalu karo 🙏", "bot");
    }
    sendBtn.disabled = false;
    scrollToBottom();
}

async function sendFileMessage(message) {
    if (!currentFile) return;
    appendMessageWithFile(message, "user", currentFile);
    saveMessage("user", message, currentFile);
    document.getElementById("userInput").value = "";

    const sendBtn = document.getElementById("sendBtn");
    sendBtn.disabled = true;
    const typingId = showTyping();
    const formData = new FormData();
    formData.append("file", currentFile.file);
    formData.append("message", message);
    const endpoint = currentFile.type === "document" ? "/upload-document" : "/upload-image";
    try {
        const res = await fetch(`${API_URL}${endpoint}`, { method: "POST", body: formData });
        const data = await res.json();
        removeTyping(typingId);
        appendMessage(data.response, "bot");
        saveMessage("bot", data.response);
        speakText(data.response);
    } catch (err) {
        removeTyping(typingId);
        appendMessage("File upload mein error aaya 😔", "bot");
    }
    sendBtn.disabled = false;
    removeFile();
    scrollToBottom();
}

// ============================================================
// FILE & CAMERA
// ============================================================
function handleDocumentSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (![".pdf",".docx",".txt"].some(e => file.name.toLowerCase().endsWith(e))) { alert("Sirf PDF, DOCX, ya TXT files 🙏"); return; }
    currentFile = { file, type: "document", name: file.name };
    showFilePreview(); event.target.value = "";
}
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith("image/")) { alert("Sirf image files 🙏"); return; }
    currentFile = { file, type: "image", name: file.name };
    showFilePreview(); event.target.value = "";
}
function showFilePreview() {
    if (!currentFile) return;
    const area = document.getElementById("filePreviewArea");
    const content = document.getElementById("filePreviewContent");
    if (currentFile.type === "image") {
        const reader = new FileReader();
        reader.onload = e => { content.innerHTML = `<img src="${e.target.result}" /><span>${currentFile.name}</span>`; };
        reader.readAsDataURL(currentFile.file);
    } else { content.innerHTML = `<span>📄 ${currentFile.name}</span>`; }
    area.style.display = "flex";
}
function removeFile() {
    currentFile = null;
    document.getElementById("filePreviewArea").style.display = "none";
    document.getElementById("filePreviewContent").innerHTML = "";
}
async function openCamera() {
    const modal = document.getElementById("cameraModal");
    const video = document.getElementById("cameraVideo");
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = cameraStream;
        modal.style.display = "flex";
    } catch { alert("Camera access nahi mila 😔"); }
}
function closeCamera() {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
    document.getElementById("cameraModal").style.display = "none";
}
function capturePhoto() {
    const video = document.getElementById("cameraVideo");
    const canvas = document.getElementById("cameraCanvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(blob => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        currentFile = { file, type: "image", name: file.name };
        showFilePreview(); closeCamera();
    }, "image/jpeg");
}

// ============================================================
// UI HELPERS
// ============================================================
function appendMessage(text, sender) {
    // Hide welcome screen when first message appears
    document.getElementById("welcomeScreen").style.display = "none";
    document.getElementById("messagesList").style.display = "flex";

    const list = document.getElementById("messagesList");
    const u = localStorage.getItem("studymate_user") || "You";
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("msg-row", sender === "user" ? "user" : "bot");

    const avatar = document.createElement("div");
    avatar.classList.add("msg-avatar", sender === "user" ? "user-av" : "bot-av");
    avatar.textContent = sender === "user" ? u.charAt(0).toUpperCase() : "S";

    const content = document.createElement("div");
    content.classList.add("msg-content");

    const name = document.createElement("div");
    name.classList.add("msg-name");
    name.textContent = sender === "user" ? u : "StudyMate";

    const bubble = document.createElement("div");
    bubble.classList.add("msg-bubble");
    bubble.innerHTML = formatText(text);

    content.appendChild(name);
    content.appendChild(bubble);
    msgDiv.appendChild(avatar);
    msgDiv.appendChild(content);
    list.appendChild(msgDiv);
    scrollToBottom();
}
function appendMessageWithFile(text, sender, fileInfo) {
    const chatMessages = document.getElementById("chatMessages");
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", "user-message");
    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.textContent = "👩‍🎓";
    const bubble = document.createElement("div");
    bubble.classList.add("bubble");
    if (fileInfo.type === "image") {
        const reader = new FileReader();
        reader.onload = e => { bubble.innerHTML = `<img src="${e.target.result}" />${text ? `<br>${formatText(text)}` : ""}`; };
        reader.readAsDataURL(fileInfo.file);
    } else { bubble.innerHTML = `📄 ${fileInfo.name}<br>${formatText(text)}`; }
    msgDiv.appendChild(avatar); msgDiv.appendChild(bubble);
    chatMessages.appendChild(msgDiv); scrollToBottom();
}
function formatText(text) {
    return text
        // H2 headings — ## Heading
        .replace(/^## (.+)$/gm, '<h2 style="font-size:1.1rem;font-weight:700;margin:16px 0 6px;color:#1f1f1f;">$1</h2>')
        // H3 headings — ### Heading
        .replace(/^### (.+)$/gm, '<h3 style="font-size:1rem;font-weight:600;margin:12px 0 4px;color:#1f1f1f;">$1</h3>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Bullet points — lines starting with - or *
        .replace(/^[\-\*] (.+)$/gm, '<li style="margin:3px 0 3px 18px;list-style:disc;">$1</li>')
        // Numbered list
        .replace(/^\d+\. (.+)$/gm, '<li style="margin:3px 0 3px 18px;list-style:decimal;">$1</li>')
        // Wrap consecutive <li> in <ul>
        .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul style="margin:6px 0;padding-left:4px;">$&</ul>')
        // Code blocks
        .replace(/`([^`]+)`/g, '<code style="background:#f1f3f4;padding:2px 6px;border-radius:4px;font-size:0.88rem;font-family:monospace;">$1</code>')
        // Horizontal rule
        .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e0e0e0;margin:12px 0;">')
        // Line breaks
        .replace(/\n\n/g, '</p><p style="margin:8px 0;">')
        .replace(/\n/g, '<br>');
}
function showTyping() {
    document.getElementById("welcomeScreen").style.display = "none";
    document.getElementById("messagesList").style.display = "flex";
    const id = "typing-" + Date.now();
    const list = document.getElementById("messagesList");
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("msg-row", "bot"); msgDiv.id = id;
    const avatar = document.createElement("div"); avatar.classList.add("msg-avatar","bot-av"); avatar.textContent = "S";
    const content = document.createElement("div"); content.classList.add("msg-content");
    const typing = document.createElement("div"); typing.classList.add("typing-dots");
    typing.innerHTML = "<span></span><span></span><span></span>";
    content.appendChild(typing);
    msgDiv.appendChild(avatar); msgDiv.appendChild(content);
    list.appendChild(msgDiv); scrollToBottom();
    return id;
}
function removeTyping(id) { const el = document.getElementById(id); if (el) el.remove(); }
function handleKeyDown(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
function autoResize(el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }
function scrollToBottom() { const c = document.getElementById("chatArea"); if(c) c.scrollTop = c.scrollHeight; }
function setPrompt(text) { const i = document.getElementById("userInput"); i.value = text; i.focus(); autoResize(i); }
async function clearChat() {
    try { await fetch(`${API_URL}/clear`, { method: "POST" }); } catch {}
    clearHistoryStorage();
    document.getElementById("messagesList").innerHTML = "";
    document.getElementById("messagesList").style.display = "none";
    document.getElementById("welcomeScreen").style.display = "flex";
    removeFile();
}
window.addEventListener("DOMContentLoaded", () => {
    updateHistorySidebar();
    restoreChatFromHistory();
});
