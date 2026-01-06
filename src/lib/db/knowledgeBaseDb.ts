import { neon } from '@neondatabase/serverless';
import { KnowledgeItem } from '@/stores/useResumeStore';

const sql = neon(import.meta.env.VITE_NEON_DATABASE_URL || '');

/**
 * Initialize the knowledge_base table if it doesn't exist
 */
export async function initKnowledgeBaseTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(20) NOT NULL CHECK (type IN ('project', 'skill', 'experience', 'achievement')),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create index for full-text search
    await sql`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_search 
      ON knowledge_base USING GIN (to_tsvector('english', title || ' ' || content))
    `;

    // Create index for tags
    await sql`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags 
      ON knowledge_base USING GIN (tags)
    `;
  } catch (error) {
    console.error('Error initializing knowledge base table:', error);
    throw error;
  }
}

/**
 * Get all knowledge base items
 */
export async function getAllKnowledgeItems(): Promise<KnowledgeItem[]> {
  try {
    const rows = await sql`
      SELECT 
        id::text as id,
        type,
        title,
        content,
        tags
      FROM knowledge_base
      ORDER BY created_at DESC
    `;

    return rows.map((row: any) => ({
      id: row.id,
      type: row.type as KnowledgeItem['type'],
      title: row.title,
      content: row.content,
      tags: row.tags || [],
      embedding: undefined, // Embeddings can be added later if pgvector is enabled
    }));
  } catch (error) {
    console.error('Error fetching knowledge items:', error);
    throw error;
  }
}

/**
 * Get a single knowledge base item by ID
 */
export async function getKnowledgeItem(id: string): Promise<KnowledgeItem | null> {
  try {
    const rows = await sql`
      SELECT 
        id::text as id,
        type,
        title,
        content,
        tags
      FROM knowledge_base
      WHERE id = ${id}::uuid
      LIMIT 1
    `;

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0] as any;
    return {
      id: row.id,
      type: row.type as KnowledgeItem['type'],
      title: row.title,
      content: row.content,
      tags: row.tags || [],
      embedding: row.embedding ? Array.from(row.embedding) : undefined,
    };
  } catch (error) {
    console.error('Error fetching knowledge item:', error);
    throw error;
  }
}

/**
 * Create a new knowledge base item
 */
export async function createKnowledgeItem(
  item: Omit<KnowledgeItem, 'id'>
): Promise<KnowledgeItem> {
  try {
    const rows = await sql`
      INSERT INTO knowledge_base (type, title, content, tags)
      VALUES (${item.type}, ${item.title}, ${item.content}, ${item.tags || []})
      RETURNING id::text as id, type, title, content, tags
    `;

    const row = rows[0] as any;
    return {
      id: row.id,
      type: row.type as KnowledgeItem['type'],
      title: row.title,
      content: row.content,
      tags: row.tags || [],
      embedding: row.embedding ? Array.from(row.embedding) : undefined,
    };
  } catch (error) {
    console.error('Error creating knowledge item:', error);
    throw error;
  }
}

/**
 * Update a knowledge base item
 */
export async function updateKnowledgeItem(
  id: string,
  updates: Partial<Omit<KnowledgeItem, 'id'>>
): Promise<KnowledgeItem> {
  try {
    // Get existing item first
    const existing = await getKnowledgeItem(id);
    if (!existing) {
      throw new Error(`Knowledge item with id ${id} not found`);
    }

    // Merge updates with existing values
    const updatedItem = {
      type: updates.type ?? existing.type,
      title: updates.title ?? existing.title,
      content: updates.content ?? existing.content,
      tags: updates.tags ?? existing.tags,
      embedding: updates.embedding ?? existing.embedding,
    };

    const rows = await sql`
      UPDATE knowledge_base
      SET 
        type = ${updatedItem.type},
        title = ${updatedItem.title},
        content = ${updatedItem.content},
        tags = ${updatedItem.tags || []},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}::uuid
      RETURNING id::text as id, type, title, content, tags
    `;

    if (rows.length === 0) {
      throw new Error(`Knowledge item with id ${id} not found`);
    }

    const row = rows[0] as any;
    return {
      id: row.id,
      type: row.type as KnowledgeItem['type'],
      title: row.title,
      content: row.content,
      tags: row.tags || [],
      embedding: row.embedding ? Array.from(row.embedding) : undefined,
    };
  } catch (error) {
    console.error('Error updating knowledge item:', error);
    throw error;
  }
}

/**
 * Delete a knowledge base item
 */
export async function deleteKnowledgeItem(id: string): Promise<void> {
  try {
    await sql`
      DELETE FROM knowledge_base
      WHERE id = ${id}::uuid
    `;
  } catch (error) {
    console.error('Error deleting knowledge item:', error);
    throw error;
  }
}

/**
 * Search knowledge base items by text
 */
export async function searchKnowledgeItems(
  query: string,
  limit: number = 10
): Promise<KnowledgeItem[]> {
  try {
    const rows = await sql`
      SELECT 
        id::text as id,
        type,
        title,
        content,
        tags,
        ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', ${query})) as rank
      FROM knowledge_base
      WHERE 
        to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ${query})
        OR ${query} = ANY(tags)
        OR title ILIKE ${'%' + query + '%'}
        OR content ILIKE ${'%' + query + '%'}
      ORDER BY rank DESC, created_at DESC
      LIMIT ${limit}
    `;

    return rows.map((row: any) => ({
      id: row.id,
      type: row.type as KnowledgeItem['type'],
      title: row.title,
      content: row.content,
      tags: row.tags || [],
      embedding: undefined, // Embeddings can be added later if pgvector is enabled
    }));
  } catch (error) {
    console.error('Error searching knowledge items:', error);
    throw error;
  }
}

