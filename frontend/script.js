const API_URL = "http://localhost:8000";
let currentFile = null;
let cameraStream = null;

// Send text message
async function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input.value.trim();
    
    // If file is attached, send with file
    if (currentFile) {
        await sendFileMessage(message || "Is file ko analyze karo");
        return;
    }
    
    if (!message) return;

    appendMessage(message, "user");
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

    } catch (err) {
        removeTyping(typingId);
        appendMessage("Backend se connection nahi ho pa raha. Backend chalu karo 🙏", "bot");
    }

    sendBtn.disabled = false;
    scrollToBottom();
}

// Send file message
async function sendFileMessage(message) {
    if (!currentFile) return;

    const input = document.getElementById("userInput");
    appendMessageWithFile(message, "user", currentFile);
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
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        removeTyping(typingId);
        appendMessage(data.response, "bot");

    } catch (err) {
        removeTyping(typingId);
        appendMessage("File upload mein error aaya. Backend check karo 😔", "bot");
    }

    sendBtn.disabled = false;
    removeFile();
    scrollToBottom();
}

// Handle document selection
function handleDocumentSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const validExts = [".pdf", ".docx", ".txt"];
    const filename = file.name.toLowerCase();
    if (!validExts.some(ext => filename.endsWith(ext))) {
        alert("Sirf PDF, DOCX, ya TXT files upload karo 🙏");
        return;
    }

    currentFile = { file, type: "document", name: file.name };
    showFilePreview();
    event.target.value = "";
}

// Handle image selection
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Sirf image files upload karo 🙏");
        return;
    }

    currentFile = { file, type: "image", name: file.name };
    showFilePreview();
    event.target.value = "";
}

// Show file preview
function showFilePreview() {
    if (!currentFile) return;

    const previewArea = document.getElementById("filePreviewArea");
    const previewContent = document.getElementById("filePreviewContent");

    if (currentFile.type === "image") {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContent.innerHTML = `
                <img src="${e.target.result}" />
                <span>${currentFile.name}</span>
            `;
        };
        reader.readAsDataURL(currentFile.file);
    } else {
        previewContent.innerHTML = `<span>📄 ${currentFile.name}</span>`;
    }

    previewArea.style.display = "flex";
}

// Remove file
function removeFile() {
    currentFile = null;
    document.getElementById("filePreviewArea").style.display = "none";
    document.getElementById("filePreviewContent").innerHTML = "";
}

// Open camera
async function openCamera() {
    const modal = document.getElementById("cameraModal");
    const video = document.getElementById("cameraVideo");

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" } 
        });
        video.srcObject = cameraStream;
        modal.style.display = "flex";
    } catch (err) {
        alert("Camera access nahi mil pa raha 😔 Browser mein camera permission check karo!");
    }
}

// Close camera
function closeCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    document.getElementById("cameraModal").style.display = "none";
}

// Capture photo from camera
function capturePhoto() {
    const video = document.getElementById("cameraVideo");
    const canvas = document.getElementById("cameraCanvas");
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        currentFile = { file, type: "image", name: file.name };
        showFilePreview();
        closeCamera();
    }, "image/jpeg");
}

// Append message to chat
function appendMessage(text, sender) {
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

// Append message with file attachment
function appendMessageWithFile(text, sender, fileInfo) {
    const chatMessages = document.getElementById("chatMessages");

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender === "user" ? "user-message" : "bot-message");

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.textContent = sender === "user" ? "👩‍🎓" : "🎓";

    const bubble = document.createElement("div");
    bubble.classList.add("bubble");

    if (fileInfo.type === "image") {
        const reader = new FileReader();
        reader.onload = (e) => {
            bubble.innerHTML = `
                <img src="${e.target.result}" />
                ${text ? `<br>${formatText(text)}` : ""}
            `;
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

// Format text
function formatText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>");
}

// Show typing indicator
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

// Remove typing indicator
function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Handle Enter key
function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// Auto resize textarea
function autoResize(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

// Scroll to bottom
function scrollToBottom() {
    const chatMessages = document.getElementById("chatMessages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Set prompt from sidebar
function setPrompt(text) {
    const input = document.getElementById("userInput");
    input.value = text;
    input.focus();
    autoResize(input);
}

// Clear chat
async function clearChat() {
    try {
        await fetch(`${API_URL}/clear`, { method: "POST" });
    } catch (err) {}

    const chatMessages = document.getElementById("chatMessages");
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="avatar">🎓</div>
            <div class="bubble">
                Chat clear ho gayi! 🗑️ Chalo naye sar se shuru karte hain. Kya padhna hai aaj? 😊
            </div>
        </div>
    `;
    removeFile();
}
