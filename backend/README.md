# DocuMind Backend

This is the backend API for DocuMind, built with Python and FastAPI.

## Getting Started

First, create a virtual environment and install the dependencies:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Then, run the development server:

```bash
fastapi dev
```

The API will be available at [http://localhost:8000](http://localhost:8000).

## API Documentation

Once the server is running, you can access the automatic API documentation:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Project Structure

- `main.py`: Main application entry point
- `models.py`: Data models and schemas
- `db.py`: Database connection and operations
- `rag.py`: Retrieval-Augmented Generation implementation
- `uploaded_documents/`: Directory for storing uploaded documents

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
GOOGLE_API_KEY=your_openai_api_key_here
```

## Learn More

To learn more about the technologies used in this project:

- [FastAPI Documentation](https://fastapi.tiangolo.com/) - learn about FastAPI features and API.
- [SQLite Documentation](https://www.sqlite.org/docs.html) - learn about SQLite database operations.