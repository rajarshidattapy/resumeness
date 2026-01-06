import { initKnowledgeBaseTable } from './knowledgeBaseDb';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the database schema
 * This is safe to call multiple times - it will only run once
 */
export async function initDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Check if database URL is configured
      const dbUrl = import.meta.env.VITE_NEON_DATABASE_URL;
      if (!dbUrl) {
        console.warn('VITE_NEON_DATABASE_URL is not configured. Knowledge base will use local storage only.');
        isInitialized = true;
        return;
      }

      await initKnowledgeBaseTable();
      isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Don't throw - allow app to continue with local storage fallback
      isInitialized = true;
    }
  })();

  return initPromise;
}

