from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from .rag import query_documents, ingest_document, delete_embeddings_for_document
from .db import create_db_and_tables, save_message, get_chat_sessions, get_messages_for_session, delete_session, save_document_metadata, get_documents_for_session, update_document_status, delete_document
import shutil
import os
from typing import Optional

UPLOAD_DIR = "uploaded_documents"

app = FastAPI()

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    os.makedirs(UPLOAD_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/upload_document")
async def upload_document(
    session_id: str = Form(...),
    url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    if not url and not file:
        return {"message": "Either URL or file must be provided"}, 400

    doc_name = ""
    doc_type = ""
    doc_url = None
    doc_file_path = None

    if url:
        doc_name = url
        doc_type = "url"
        doc_url = url
    elif file:
        doc_name = file.filename or ""
        doc_type = "pdf"  # Assuming PDF for file uploads for now
        if file.filename is None:
            return {"message": "Uploaded file must have a filename"}, 400
        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        doc_file_path = file_location

    # Save document metadata with 'pending' status
    document = save_document_metadata(
        session_id=session_id,
        name=doc_name,
        doc_type=doc_type,
        status="pending",
        url=doc_url,
        file_path=doc_file_path
    )

    # Trigger ingestion as a background task
    source = doc_url if doc_type == "url" else doc_file_path
    if source is None:
        return {"message": "Document source could not be determined"}, 400
    background_tasks.add_task(
        ingest_document,
        session_id,
        source,
        str(document.id),  # Pass document ID to update status later
        doc_type
    )

    return {"message": "Document upload initiated", "document_id": str(document.id)}


@app.get("/query")
async def query_rag(session_id: str, input_message: str):
    save_message(session_id, "user", input_message)
    
    # Use the enhanced RAG function
    ai_response = query_documents(session_id, input_message)
    
    # Handle both string and dict responses
    if isinstance(ai_response, dict):
        answer = ai_response.get("answer", "Sorry, I couldn't process that request.")
        sources = ai_response.get("sources", [])
    else:
        answer = str(ai_response)
        sources = []
    
    # Save AI response with sources
    if isinstance(ai_response, dict):
        save_message(session_id, "ai", ai_response.get("answer", ""), ai_response.get("sources", []))
    else:
        save_message(session_id, "ai", str(ai_response), [])
    return {"response": answer, "sources": sources}

@app.get("/chat_sessions")
async def get_all_chat_sessions():
    sessions = get_chat_sessions()
    return sessions

@app.get("/chat_sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    messages = get_messages_for_session(session_id)
    # Convert messages to dictionaries to ensure proper serialization
    return [message.dict() for message in messages]

@app.delete("/chat_sessions/{session_id}")
async def delete_chat_session(session_id: str):
    deleted_document_ids = delete_session(session_id)
    for doc_id in deleted_document_ids:
        delete_embeddings_for_document(session_id, doc_id)
    return {"message": "Chat session deleted successfully"}

@app.get("/documents")
async def get_session_documents(session_id: str):
    documents = get_documents_for_session(session_id)
    return documents

@app.delete("/documents/{document_id}")
async def delete_document_endpoint(document_id: str, session_id: str = ""):
    delete_embeddings_for_document(session_id, document_id)
    delete_document(document_id)
    return {"message": "Document deleted successfully"}

# This is required for Vercel serverless deployment
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
