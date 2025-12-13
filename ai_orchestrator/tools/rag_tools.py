"""RAG tools for vector search and context retrieval."""
from typing import List, Dict, Any, Optional
from langchain.tools import tool
from pymongo import MongoClient
try:
    from ..config import settings
except ImportError:
    from config import settings


# MongoDB client (if using direct MongoDB access)
_mongo_client: Optional[MongoClient] = None


def get_mongo_client() -> Optional[MongoClient]:
    """Get MongoDB client instance."""
    global _mongo_client
    if _mongo_client is None and settings.mongodb_uri:
        _mongo_client = MongoClient(settings.mongodb_uri)
    return _mongo_client


@tool
async def search_workspace_context(
    workspace_id: str,
    query: str,
    top_k: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Search workspace context using vector search.
    
    Args:
        workspace_id: The workspace ID
        query: Search query
        top_k: Number of results to return (defaults to config)
    
    Returns:
        List of relevant context documents
    """
    if not settings.mongodb_uri:
        # If no MongoDB URI, return empty (could fallback to backend API)
        return []
    
    try:
        client = get_mongo_client()
        if not client:
            return []
        
        db = client.get_database()
        collection = db[settings.vector_search_collection]
        
        # MongoDB Atlas Vector Search query
        # This assumes you have a vector search index set up
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",  # Name of your vector search index
                    "path": "embedding",
                    "queryVector": query,  # This would need to be an embedding vector
                    "numCandidates": (top_k or settings.vector_search_top_k) * 10,
                    "limit": top_k or settings.vector_search_top_k,
                    "filter": {
                        "workspaceId": workspace_id
                    }
                }
            },
            {
                "$project": {
                    "text": 1,
                    "type": 1,
                    "metadata": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]
        
        results = list(collection.aggregate(pipeline))
        return results
    except Exception as e:
        print(f"Error in vector search: {e}")
        # Fallback: could query backend API for context
        return []


@tool
async def index_workspace_context(
    workspace_id: str,
    text: str,
    context_type: str,
    metadata: Optional[Dict[str, Any]] = None,
    embedding: Optional[List[float]] = None
) -> Dict[str, Any]:
    """
    Index workspace context for RAG.
    
    Args:
        workspace_id: The workspace ID
        text: Text content to index
        context_type: Type of context (e.g., 'message', 'task', 'summary')
        metadata: Additional metadata
        embedding: Pre-computed embedding vector (optional)
    
    Returns:
        Indexed document ID
    """
    if not settings.mongodb_uri:
        return {"success": False, "reason": "MongoDB not configured"}
    
    try:
        client = get_mongo_client()
        if not client:
            return {"success": False, "reason": "MongoDB client not available"}
        
        db = client.get_database()
        collection = db[settings.vector_search_collection]
        
        # If embedding not provided, would need to generate it
        # For now, placeholder
        doc = {
            "workspaceId": workspace_id,
            "type": context_type,
            "text": text,
            "metadata": metadata or {},
            "embedding": embedding or []  # Would need to generate embedding
        }
        
        result = collection.insert_one(doc)
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        print(f"Error indexing context: {e}")
        return {"success": False, "reason": str(e)}

