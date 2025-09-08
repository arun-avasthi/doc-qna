from typing import Optional, List
from datetime import datetime
from uuid import UUID, uuid4
import json

from sqlmodel import Field, SQLModel, Relationship

class ChatMessage(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    session_id: UUID = Field(foreign_key="chatsession.id", index=True)
    sender: str
    text: str
    sources: Optional[str] = Field(default=None)  # Store sources as JSON string
    timestamp: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    session: "ChatSession" = Relationship(back_populates="messages")
    
    def set_sources(self, sources_data: List[dict]):
        """Set sources data as JSON string"""
        self.sources = json.dumps(sources_data) if sources_data else None
    
    def get_sources(self) -> List[dict]:
        """Get sources data from JSON string"""
        if self.sources:
            try:
                return json.loads(self.sources)
            except json.JSONDecodeError:
                return []
        return []
    
    def dict(self, *args, **kwargs):
        # Include sources in the dictionary representation
        d = super().dict(*args, **kwargs)
        d["sources"] = self.get_sources()
        return d

class ChatSession(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    messages: List["ChatMessage"] = Relationship(back_populates="session")
    documents: List["Document"] = Relationship(back_populates="session")

class Document(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    session_id: UUID = Field(foreign_key="chatsession.id", index=True)
    name: str
    type: str  # e.g., "url", "pdf"
    status: str  # e.g., "pending", "processing", "ready", "failed"
    url: Optional[str] = None
    file_path: Optional[str] = None # For PDF files stored locally
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    session: "ChatSession" = Relationship(back_populates="documents")