const API_URL = "http://localhost:8000";
let currentFile = null;
let cameraStream = null;

// ============================================================
// CHAT HISTORY — localStorage mein store hoti hai
// ============================================================

function getUser() {
    return localStorage.getItem("studymate_user") || "Guest";
}

function getHistoryKey() {
    return `studymate_history_${getUser()}`;
}

function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(getHistoryKey())) || [];
    } catch { return []; }
}

function saveMessage(role, text, fileInfo = null) {
    const history = loadHistory();
    history.push({
        role,
        text,
        fileInfo: fileInfo ? { name: fileInfo.name, type: fileInfo.type } : null,
        timestamp: new Date().toISOString()
    });
    // Max 200 messages store
    if (history.length > 200) history.splice(0, history.length - 200);
    localStorage.setItem(getHistoryKey(), JSON.stringify(history));
    updateHistorySidebar();
}

function clearHistoryStorage() {
    localStorage.removeItem(getHistoryKey());
    updateHistorySidebar();
}

// Group history by date for sidebar
function groupByDate(history) {
    const groups = {};
    history.forEach(msg => {
        if (msg.role !== "user") return;
        const date = new Date(msg.timestamp);
        const key = date.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
        if (!groups[key]) groups[key] = [];
        groups[key].push(msg);
    });
    return groups;
}

function updateHistorySidebar() {
    const sidebar = document.getElementById("historySidebar");
    if (!sidebar) return;
    const history = loadHistory();
    const groups = groupByDate(history);
    const dates = Object.keys(groups).reverse();

    if (dates.length === 0) {
        sidebar.innerHTML = '<p class="no-history">Koi history nahi hai abhi 📭</p>';
        return;
    }

    sidebar.innerHTML = dates.map(date => `
        <div class="history-group">
            <div class="history-date">${date}</div>
            ${groups[date].slice(-3).reverse().map(msg => `
                <div class="history-item" onclick="loadHistoryMessage('${encodeURIComponent(msg.text.substring(0,100))}')">
                    ${msg.text.substring(0, 45)}${msg.text.length > 45 ? "..." : ""}
                </div>
            `).join("")}
        </div>
    `).join("");
}

function loadHistoryMessage(encodedText) {
    const text = decodeURIComponent(encodedText);
    document.getElementById("userInput").value = text;
    autoResize(document.getElementById("userInput"));
    document.getElementById("userInput").focus();
}

// Restore chat on page load
function restoreChatFromHistory() {
    const history = loadHistory();
    if (history.length === 0) return;

    const chatMessages = document.getElementById("chatMessages");
    // Show last 20 messages
    const recent = history.slice(-20);
    recent.forEach(msg => {
        if (msg.fileInfo) {
            appendMessageText(
                (msg.fileInfo.type === "image" ? "🖼️ " : "📄 ") + msg.fileInfo.name + (msg.text ? "\n" + msg.text : ""),
                msg.role === "user" ? "user" : "bot"
            );
        } else {
            appendMessageText(msg.text, msg.role === "user" ? "user" : "bot");
        }
    });
    scrollToBottom();
}

// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input.value.trim();

    if (currentFile) {
        await sendFileMessage(message || "Is file ko analyze karo");
        return;
    }

    if (!message) return;

    appendMessageText(message, "user");
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
        appendMessageText(data.response, "bot");
        saveMessage("bot", data.response);
    } catch (err) {
        removeTyping(typingId);
        const errMsg = "Backend se connection nahi ho pa raha. Backend chalu karo 🙏";
        appendMessageText(errMsg, "bot");
    }

    sendBtn.disabled = false;
    scrollToBottom();
}

async function sendFileMessage(message) {
    if (!currentFile) return;

    const input = document.getElementById("userInput");
    appendMessageWithFile(message, "user", currentFile);
    saveMessage("user", message, currentFile);
    input.value = "";
    autoResize(input);

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
        appendMessageText(data.response, "bot");
        saveMessage("bot", data.response);
    } catch (err) {
        removeTyping(typingId);
        appendMessageText("File upload mein error aaya 😔", "bot");
    }

    sendBtn.disabled = false;
    removeFile();
    scrollToBottom();
}

// ============================================================
// FILE HANDLING
// ============================================================

function handleDocumentSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const validExts = [".pdf", ".docx", ".txt"];
    if (!validExts.some(ext => file.name.toLowerCase().endsWith(ext))) {
        alert("Sirf PDF, DOCX, ya TXT files upload karo 🙏"); return;
    }
    currentFile = { file, type: "document", name: file.name };
    showFilePreview();
    event.target.value = "";
}

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Sirf image files upload karo 🙏"); return; }
    currentFile = { file, type: "image", name: file.name };
    showFilePreview();
    event.target.value = "";
}

function showFilePreview() {
    if (!currentFile) return;
    const previewArea = document.getElementById("filePreviewArea");
    const previewContent = document.getElementById("filePreviewContent");
    if (currentFile.type === "image") {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContent.innerHTML = `<img src="${e.target.result}" /><span>${currentFile.name}</span>`;
        };
        reader.readAsDataURL(currentFile.file);
    } else {
        previewContent.innerHTML = `<span>📄 ${currentFile.name}</span>`;
    }
    previewArea.style.display = "flex";
}

function removeFile() {
    currentFile = null;
    document.getElementById("filePreviewArea").style.display = "none";
    document.getElementById("filePreviewContent").innerHTML = "";
}

// ============================================================
// CAMERA
// ============================================================

async function openCamera() {
    const modal = document.getElementById("cameraModal");
    const video = document.getElementById("cameraVideo");
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = cameraStream;
        modal.style.display = "flex";
    } catch (err) {
        alert("Camera access nahi mil pa raha 😔 Browser mein camera permission check karo!");
    }
}

function closeCamera() {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
    document.getElementById("cameraModal").style.display = "none";
}

function capturePhoto() {
    const video = document.getElementById("cameraVideo");
    const canvas = document.getElementById("cameraCanvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        currentFile = { file, type: "image", name: file.name };
        showFilePreview();
        closeCamera();
    }, "image/jpeg");
}

// ============================================================
// UI HELPERS
// ============================================================

function appendMessageText(text, sender) {
    const chatMessages = document.getElementById("chatMessages");
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender === "user" ? "user-message" : "bot-message");
    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.textContent = sender === "user" ? "👩‍🎓" : "🎓";
    const bubble = document.createElement("div");
    bubble.classList.add("bubble");
    bubble.innerHTML = formatText(text);
    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    chatMessages.appendChild(msgDiv);
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
        reader.onload = (e) => {
            bubble.innerHTML = `<img src="${e.target.result}" />${text ? `<br>${formatText(text)}` : ""}`;
        };
        reader.readAsDataURL(fileInfo.file);
    } else {
        bubble.innerHTML = `📄 ${fileInfo.name}<br>${formatText(text)}`;
    }
    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
}

function formatText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>");
}

function showTyping() {
    const chatMessages = document.getElementById("chatMessages");
    const id = "typing-" + Date.now();
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", "bot-message");
    msgDiv.id = id;
    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.textContent = "🎓";
    const typing = document.createElement("div");
    typing.classList.add("typing-indicator");
    typing.innerHTML = "<span></span><span></span><span></span>";
    msgDiv.appendChild(avatar);
    msgDiv.appendChild(typing);
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
    return id;
}

function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

function scrollToBottom() {
    const c = document.getElementById("chatMessages");
    c.scrollTop = c.scrollHeight;
}

function setPrompt(text) {
    const input = document.getElementById("userInput");
    input.value = text;
    input.focus();
    autoResize(input);
}

async function clearChat() {
    try { await fetch(`${API_URL}/clear`, { method: "POST" }); } catch (err) {}
    clearHistoryStorage();
    document.getElementById("chatMessages").innerHTML = `
        <div class="message bot-message">
            <div class="avatar">🎓</div>
            <div class="bubble">Chat clear ho gayi! 🗑️ Chalo naye sar se shuru karte hain. Kya padhna hai aaj? 😊</div>
        </div>`;
    removeFile();
}

// ============================================================
// INIT
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
    updateHistorySidebar();
    restoreChatFromHistory();
});
