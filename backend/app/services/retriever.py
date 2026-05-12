from typing import List, Dict
from app.services.embedding_service import get_embedding, cosine_similarity
from app.utils.logger import logger

async def retrieve_relevant_kb_items(
    job_description: str,
    kb_items: List[Dict],
    top_k: int = 5
) -> List[Dict]:
    """Retrieve most relevant KB items using embeddings"""
    
    if not kb_items:
        logger.warning("No KB items provided")
        return []
    
    try:
        # Get JD embedding
        jd_embedding = await get_embedding(job_description)
        
        # Calculate similarity scores
        scored_items = []
        for item in kb_items:
            # Create searchable text from item
            item_text = f"{item['title']} {item['content']} {' '.join(item.get('tags', []))}"
            
            # Get or compute embedding
            if item.get('embedding'):
                item_embedding = item['embedding']
            else:
                item_embedding = await get_embedding(item_text)
            
            similarity = cosine_similarity(jd_embedding, item_embedding)
            scored_items.append({
                **item,
                'relevance_score': similarity
            })
        
        # Sort by relevance and return top K
        scored_items.sort(key=lambda x: x['relevance_score'], reverse=True)
        top_items = scored_items[:top_k]
        
        logger.info(f"Retrieved {len(top_items)} relevant KB items")
        for item in top_items:
            logger.info(f"  - {item['title']} ({item['type']}): {item['relevance_score']:.3f}")
        
        return top_items
        
    except Exception as e:
        logger.error(f"Error retrieving KB items: {e}")
        return kb_items[:top_k]  # Fallback to first K items
