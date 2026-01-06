# Neon Database Integration for Knowledge Base

## Overview

The Knowledge Base now uses **Neon Serverless PostgreSQL** for persistent storage instead of browser localStorage. This provides:

- ✅ Persistent storage across devices
- ✅ Full-text search capabilities
- ✅ Better performance for large knowledge bases
- ✅ Automatic schema initialization
- ✅ Graceful fallback to localStorage if database is unavailable

## Setup

### 1. Environment Variable

Add your Neon database connection string to `.env`:

```bash
VITE_NEON_DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

You can get your connection string from the [Neon Console](https://console.neon.tech).

### 2. Database Schema

The schema is automatically created on first run. The `knowledge_base` table includes:

- `id` (UUID) - Primary key
- `type` (VARCHAR) - One of: 'project', 'skill', 'experience', 'achievement'
- `title` (VARCHAR) - Item title
- `content` (TEXT) - Item description/content
- `tags` (TEXT[]) - Array of tags
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

### 3. Indexes

The following indexes are automatically created for performance:

- **Full-text search index** on `title` and `content` using PostgreSQL's `to_tsvector`
- **GIN index** on `tags` array for fast tag searches

## Features

### Database Operations

All knowledge base operations are now async and sync with the database:

- `loadKnowledgeBase()` - Loads all items from database
- `addKnowledgeItem()` - Creates a new item in the database
- `updateKnowledgeItem()` - Updates an existing item
- `removeKnowledgeItem()` - Deletes an item from the database
- `searchKnowledgeItems()` - Full-text search with ranking

### Fallback Behavior

If `VITE_NEON_DATABASE_URL` is not configured or database operations fail:

- The app falls back to localStorage (default knowledge items)
- All operations continue to work locally
- Error messages are displayed to the user
- No data loss occurs

### Search Capabilities

The database search supports:

- **Full-text search** using PostgreSQL's built-in text search
- **Tag matching** - Searches within tags array
- **Fuzzy matching** - ILIKE pattern matching for title and content
- **Ranking** - Results are ranked by relevance

## Usage

### In Components

```typescript
import { useResumeStore } from '@/stores/useResumeStore';

const MyComponent = () => {
  const { 
    knowledgeBase, 
    knowledgeBaseLoading,
    knowledgeBaseError,
    loadKnowledgeBase,
    addKnowledgeItem 
  } = useResumeStore();

  useEffect(() => {
    loadKnowledgeBase(); // Load from database on mount
  }, [loadKnowledgeBase]);

  const handleAdd = async () => {
    await addKnowledgeItem({
      type: 'project',
      title: 'My Project',
      content: 'Description...',
      tags: ['React', 'TypeScript']
    });
  };
};
```

### Database Service API

Direct database operations are available in `src/lib/db/knowledgeBaseDb.ts`:

```typescript
import {
  getAllKnowledgeItems,
  createKnowledgeItem,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  searchKnowledgeItems
} from '@/lib/db/knowledgeBaseDb';
```

## Migration Notes

### From localStorage

- Existing localStorage data is not automatically migrated
- Users should manually re-add items or export/import functionality can be added
- The default knowledge items are still available as fallback

### Schema Changes

If you need to modify the schema:

1. Update `initKnowledgeBaseTable()` in `src/lib/db/knowledgeBaseDb.ts`
2. The `CREATE TABLE IF NOT EXISTS` will only create if it doesn't exist
3. For schema changes, you may need to add migration scripts

## Troubleshooting

### Database Connection Issues

- Check that `VITE_NEON_DATABASE_URL` is set correctly
- Verify the connection string format
- Ensure SSL mode is set to `require` for Neon
- Check browser console for connection errors

### Search Not Working

- Full-text search requires English text
- Ensure the database has the necessary extensions (usually enabled by default)
- Check that the indexes were created successfully

### Performance

- The database automatically creates indexes for fast searches
- For very large knowledge bases, consider pagination
- Full-text search is optimized with GIN indexes

## Future Enhancements

Potential improvements:

- [ ] Vector embeddings for semantic search (requires pgvector extension)
- [ ] Data migration from localStorage
- [ ] Export/import functionality
- [ ] Pagination for large knowledge bases
- [ ] Real-time sync across multiple tabs/devices

