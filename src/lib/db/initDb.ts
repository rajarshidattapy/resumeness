import { initKnowledgeBaseTable } from './knowledgeBaseDb';

let isInitialized = false;

/**
 * Initialize the database schema
 * This is safe to call multiple times - it will only run once
 */
export async function initDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    await initKnowledgeBaseTable();
    isInitialized = true;
    console.log('Database initialized successfully (localStorage)');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    isInitialized = true;
  }
}

