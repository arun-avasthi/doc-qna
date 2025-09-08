from sqlmodel import create_engine, Session, SQLModel, select, desc
from .models import ChatSession, ChatMessage, Document
from uuid import UUID
from datetime import datetime
from typing import List, Optional
import os

DATABASE_URL = "sqlite:///./database.db"

engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

def save_message(session_id: str, sender: str, text: str, sources: Optional[List[dict]] = None):
    with Session(engine) as session:
        # Ensure the session exists, create if not
        chat_session = session.get(ChatSession, UUID(session_id))
        if not chat_session:
            chat_session = ChatSession(id=UUID(session_id))
            session.add(chat_session)
            session.commit()
            session.refresh(chat_session)

        message = ChatMessage(session_id=UUID(session_id), sender=sender, text=text)
        if sources is not None:
            message.set_sources(sources)
        session.add(message)
        session.commit()
        session.refresh(message)
        session.refresh(chat_session)
        chat_session.updated_at = datetime.utcnow()
        session.add(chat_session)
        session.commit()

def get_chat_sessions() -> List[ChatSession]:
    with Session(engine) as session:
        return list(session.exec(select(ChatSession).order_by(desc(ChatSession.updated_at))).all())

def get_messages_for_session(session_id: str) -> List[ChatMessage]:
    with Session(engine) as session:
        messages = list(session.exec(select(ChatMessage).where(ChatMessage.session_id == UUID(session_id))).all())
        # The dict() method in ChatMessage model will automatically convert sources to proper format
        return messages

def delete_session(session_id: str) -> List[str]:
    deleted_document_ids = []
    with Session(engine) as session:
        # Get documents to delete and their IDs
        documents = session.exec(select(Document).where(Document.session_id == UUID(session_id))).all()
        for doc in documents:
            deleted_document_ids.append(str(doc.id))
            session.delete(doc) # Delete document metadata

        # Delete messages
        messages = session.exec(select(ChatMessage).where(ChatMessage.session_id == UUID(session_id))).all()
        for message in messages:
            session.delete(message)
        
        # Finally, delete the chat session
        chat_session = session.get(ChatSession, UUID(session_id))
        if chat_session:
            session.delete(chat_session)
            session.commit()
    return deleted_document_ids

def save_document_metadata(session_id: str, name: str, doc_type: str, status: str, url: Optional[str] = None, file_path: Optional[str] = None) -> Document:
    with Session(engine) as session:
        document = Document(
            session_id=UUID(session_id),
            name=name,
            type=doc_type,
            status=status,
            url=url,
            file_path=file_path
        )
        session.add(document)
        session.commit()
        session.refresh(document)
        return document

def get_documents_for_session(session_id: str) -> List[Document]:
    with Session(engine) as session:
        return list(session.exec(select(Document).where(Document.session_id == UUID(session_id))).all())

def update_document_status(document_id: str, new_status: str):
    with Session(engine) as session:
        document = session.get(Document, UUID(document_id))
        if document:
            document.status = new_status
            document.updated_at = datetime.utcnow()
            session.add(document)
            session.commit()
            session.refresh(document)

def delete_document(document_id: str):
    with Session(engine) as session:
        document = session.get(Document, UUID(document_id))
        if document:
            # Delete the physical file if it exists
            if document.file_path and os.path.exists(document.file_path):
                try:
                    os.remove(document.file_path)
                except Exception as e:
                    print(f"Error deleting file {document.file_path}: {e}")
            
            session.delete(document)
            session.commit()