from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from strands import Agent
from strands.models.litellm import LiteLLMModel
import os
import base64
import PyPDF2
import docx
import io

load_dotenv()

app = FastAPI()

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# StudyMate system prompt
SYSTEM_PROMPT = """
You are StudyMate — a friendly, smart AI study assistant made for students.

Your personality:
- Respond in Hinglish (mix of Hindi and English) by default
- Be friendly, encouraging, and never judgmental
- Use simple language, real-life examples, and emojis where appropriate
- Always motivate the student

You can help with:
1. Explaining any topic in simple words
2. Summarizing notes into bullet points
3. Generating MCQ quiz questions
4. Career guidance and roadmaps
5. Resume review and feedback
6. Code explanation and debugging help
7. Interview preparation
8. Analyzing uploaded documents and images

Always start your response with a warm, friendly tone.
"""

# Initialize the model for text
text_model = LiteLLMModel(
    model_id="groq/llama-3.3-70b-versatile"
)

# Initialize model for vision (images)
vision_model = LiteLLMModel(
    model_id="groq/llama-4-scout-17b-16e-instruct"
)

class ChatRequest(BaseModel):
    message: str

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        return f"PDF read karne mein error: {str(e)}"

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        text = "\n".join([para.text for para in doc.paragraphs])
        return text.strip()
    except Exception as e:
        return f"DOCX read karne mein error: {str(e)}"

def extract_text_from_txt(file_bytes: bytes) -> str:
    """Extract text from TXT file"""
    try:
        return file_bytes.decode("utf-8").strip()
    except:
        return file_bytes.decode("latin-1").strip()

@app.get("/")
def root():
    return {"message": "StudyMate AI Backend is running! 🎓"}

@app.post("/chat")
def chat(request: ChatRequest):
    agent = Agent(
        model=text_model,
        system_prompt=SYSTEM_PROMPT,
    )
    response = agent(request.message)
    return {"response": str(response)}

@app.post("/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    message: str = Form(default="Is document ko summarize karo aur key points batao")
):
    """Handle PDF, DOCX, TXT file uploads"""
    file_bytes = await file.read()
    filename = file.filename.lower()

    # Extract text based on file type
    if filename.endswith(".pdf"):
        extracted_text = extract_text_from_pdf(file_bytes)
    elif filename.endswith(".docx"):
        extracted_text = extract_text_from_docx(file_bytes)
    elif filename.endswith(".txt"):
        extracted_text = extract_text_from_txt(file_bytes)
    else:
        return {"response": "Sorry! Sirf PDF, DOCX, aur TXT files support hoti hain abhi 🙏"}

    if not extracted_text:
        return {"response": "File mein koi text nahi mila. Kya file sahi hai? 🤔"}

    # Send to agent with user's message
    prompt = f"{message}\n\nDocument content:\n{extracted_text[:8000]}"

    agent = Agent(
        model=text_model,
        system_prompt=SYSTEM_PROMPT,
    )
    response = agent(prompt)
    return {"response": str(response)}

@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    message: str = Form(default="Is image mein kya hai? Detail mein batao")
):
    """Handle image uploads — uses vision model"""
    file_bytes = await file.read()
    filename = file.filename.lower()

    # Check valid image format
    valid_formats = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    if not any(filename.endswith(fmt) for fmt in valid_formats):
        return {"response": "Sorry! Sirf JPG, PNG, GIF, WEBP images support hoti hain 🙏"}

    # Convert image to base64
    image_base64 = base64.b64encode(file_bytes).decode("utf-8")

    # Detect mime type
    if filename.endswith(".png"):
        mime_type = "image/png"
    elif filename.endswith(".gif"):
        mime_type = "image/gif"
    elif filename.endswith(".webp"):
        mime_type = "image/webp"
    else:
        mime_type = "image/jpeg"

    # Send to vision model via litellm directly
    import litellm
    try:
        response = litellm.completion(
            model="groq/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_base64}"
                            }
                        },
                        {
                            "type": "text",
                            "text": message
                        }
                    ]
                }
            ]
        )
        return {"response": response.choices[0].message.content}
    except Exception as e:
        return {"response": f"Image analyze karne mein error aaya: {str(e)} 😔"}

@app.post("/clear")
def clear_history():
    return {"message": "Conversation cleared!"}
