import os
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_community.document_loaders import (
    WebBaseLoader, 
    PyPDFLoader,
    UnstructuredMarkdownLoader,
    UnstructuredHTMLLoader,
    TextLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from .db import update_document_status
import requests
from urllib.parse import urlparse


load_dotenv()

llm = init_chat_model(
    "gemini-2.5-flash",
    model_provider="google_genai",
    api_key=os.getenv("GOOGLE_API_KEY"),
)

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")

def get_vector_store(session_id: str):
    return Chroma(
        collection_name=f"session_{session_id}_collection",
        embedding_function=embeddings,
    )

def determine_file_type(source: str, doc_type: str) -> str:
    """Determine the file type based on extension or content type"""
    if doc_type == "url":
        # Try to determine from URL
        parsed_url = urlparse(source)
        path = parsed_url.path
        if path.endswith('.pdf'):
            return "pdf"
        elif path.endswith('.md') or path.endswith('.markdown'):
            return "markdown"
        elif path.endswith('.html') or path.endswith('.htm'):
            return "html"
        else:
            # Try to determine from content-type header
            try:
                response = requests.head(source, timeout=5)
                content_type = response.headers.get('content-type', '').lower()
                if 'pdf' in content_type:
                    return "pdf"
                elif 'html' in content_type:
                    return "html"
                elif 'markdown' in content_type or 'text' in content_type:
                    return "text"
            except:
                pass
            return "html"  # Default to HTML for URLs
    elif doc_type == "pdf":
        return "pdf"
    else:
        # For file uploads, determine from file extension
        _, ext = os.path.splitext(source.lower())
        if ext == '.pdf':
            return "pdf"
        elif ext in ['.md', '.markdown']:
            return "markdown"
        elif ext in ['.html', '.htm']:
            return "html"
        else:
            return "text"

def ingest_document(session_id: str, source: str, document_id: str, doc_type: str):
    try:
        loader = None
        file_type = determine_file_type(source, doc_type)
        
        if doc_type == "url":
            loader = WebBaseLoader(web_paths=(source,))
        elif file_type == "pdf":
            loader = PyPDFLoader(source)
        elif file_type == "markdown":
            loader = UnstructuredMarkdownLoader(source)
        elif file_type == "html":
            loader = UnstructuredHTMLLoader(source)
        elif file_type == "text":
            loader = TextLoader(source)
        else:
            # Fallback to text loader
            loader = TextLoader(source)

        docs = loader.load()
        # Improve chunking strategy
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,  # Reduced chunk size for better precision
            chunk_overlap=100,  # Reduced overlap
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        all_splits = text_splitter.split_documents(docs)
        # Add document_id to metadata for each split
        for split in all_splits:
            if split.metadata is None:
                split.metadata = {}
            split.metadata["document_id"] = document_id
            # Add chunk index for better tracking
            split.metadata["chunk_index"] = all_splits.index(split)
        vector_store = get_vector_store(session_id)
        _ = vector_store.add_documents(documents=all_splits)
        update_document_status(document_id, "ready")
    except Exception as e:
        print(f"Error ingesting document {document_id}: {e}")
        update_document_status(document_id, "failed")

def query_documents(session_id: str, query: str):
    """Enhanced query function with citations and confidence scores."""
    try:
        vector_store = get_vector_store(session_id)
        # Check if there are any documents
        if vector_store._collection.count() == 0:
            return "I can only answer questions based on uploaded documents. Please upload a document to start chatting."
        
        # Retrieve relevant documents with scores
        retrieved_docs = vector_store.similarity_search_with_score(query, k=4)
        
        if not retrieved_docs:
            return "I couldn't find any relevant information in the uploaded documents."
        
        # Sort by score in descending order (highest similarity first)
        retrieved_docs = sorted(retrieved_docs, key=lambda x: x[1], reverse=True)
        
        # Separate documents and scores
        docs = [doc for doc, score in retrieved_docs]
        scores = [score for doc, score in retrieved_docs]
        
        # Format context with source information
        context_parts = []
        source_info_list = []
        for i, (doc, score) in enumerate(retrieved_docs):
            source_info = {
                "index": i+1,
                "document_id": doc.metadata.get("document_id", "")[:8] if doc.metadata.get("document_id") else "Unknown",
                "chunk_index": doc.metadata.get("chunk_index", "Unknown"),
                "score": float(score),
                "content_excerpt": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
            }
            source_info_list.append(source_info)
            context_parts.append(f"Content: {doc.page_content}")
        
        context = "\n\n".join(context_parts)
        
        # Create enhanced prompt with confidence scoring
        prompt = f"""
You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, say that you don't know. Use three sentences maximum and keep the answer concise.

Context:
{context}

Question: {query}

Answer:
"""
        
        # Generate response
        response = llm.invoke(prompt)
        answer = response.content if hasattr(response, 'content') else str(response)
        
        # Return structured response with citations
        return {
            "answer": answer,
            "sources": source_info_list
        }
        
    except Exception as e:
        print(f"Error querying documents: {e}")
        return {
            "answer": "Sorry, I encountered an error while processing your query.",
            "sources": []
        }

def delete_embeddings_for_document(session_id: str, document_id: str):
    vector_store = get_vector_store(session_id)
    # Delete embeddings where 'document_id' metadata matches the provided document_id
    vector_store.delete(where={"document_id": document_id})
    print(f"Deleted embeddings for document {document_id} in session {session_id}.")