import { KnowledgeItem } from '@/stores/useResumeStore';

let _currentUserId = '';
const getStorageKey = () =>
  _currentUserId
    ? `resumeness-kb-${_currentUserId}`
    : 'resumeness-knowledge-base';

/**
 * Set the current user ID to scope all KB storage operations.
 * Called by AuthSync when the Clerk user changes.
 */
export function setCurrentUserId(userId: string) {
  _currentUserId = userId;
}

/**
 * Read all items from localStorage
 */
function readStorage(): KnowledgeItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return [];
    return JSON.parse(raw) as KnowledgeItem[];
  } catch {
    console.warn('Failed to read knowledge base from localStorage');
    return [];
  }
}

/**
 * Write all items to localStorage
 */
function writeStorage(items: KnowledgeItem[]): void {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(items));
  } catch (e) {
    console.error('Failed to write knowledge base to localStorage:', e);
  }
}

// Fallback for crypto.randomUUID() in non-secure contexts
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Initialize the knowledge base (no-op for localStorage, kept for API compat)
 */
export async function initKnowledgeBaseTable(): Promise<void> {
  // localStorage doesn't need table creation
}

/**
 * Seed the knowledge base with default items if it's empty
 */
export async function seedKnowledgeBase(defaults: KnowledgeItem[]): Promise<void> {
  const existing = readStorage();
  if (existing.length === 0) {
    writeStorage(defaults);
    console.log(`Seeded knowledge base with ${defaults.length} items`);
  }
}

/**
 * Get all knowledge base items
 */
export async function getAllKnowledgeItems(): Promise<KnowledgeItem[]> {
  return readStorage();
}

/**
 * Get a single knowledge base item by ID
 */
export async function getKnowledgeItem(id: string): Promise<KnowledgeItem | null> {
  const items = readStorage();
  return items.find(item => item.id === id) ?? null;
}

/**
 * Create a new knowledge base item
 */
export async function createKnowledgeItem(
  item: Omit<KnowledgeItem, 'id'>
): Promise<KnowledgeItem> {
  const items = readStorage();
  const newItem: KnowledgeItem = {
    ...item,
    id: generateUUID(),
  };
  items.push(newItem);
  writeStorage(items);
  return newItem;
}

/**
 * Update a knowledge base item
 */
export async function updateKnowledgeItem(
  id: string,
  updates: Partial<Omit<KnowledgeItem, 'id'>>
): Promise<KnowledgeItem> {
  const items = readStorage();
  const index = items.findIndex(item => item.id === id);
  if (index === -1) {
    throw new Error(`Knowledge item with id ${id} not found`);
  }
  items[index] = { ...items[index], ...updates };
  writeStorage(items);
  return items[index];
}

/**
 * Delete a knowledge base item
 */
export async function deleteKnowledgeItem(id: string): Promise<void> {
  const items = readStorage();
  const filtered = items.filter(item => item.id !== id);
  writeStorage(filtered);
}

/**
 * Search knowledge base items by text
 */
export async function searchKnowledgeItems(
  query: string,
  limit: number = 10
): Promise<KnowledgeItem[]> {
  const items = readStorage();
  const q = query.toLowerCase();

  // Score each item by relevance
  const scored = items.map(item => {
    let score = 0;
    const title = item.title.toLowerCase();
    const content = item.content.toLowerCase();
    const tags = item.tags.map(t => t.toLowerCase());

    // Exact tag match = highest
    if (tags.includes(q)) score += 10;
    // Tag partial match
    tags.forEach(tag => { if (tag.includes(q) || q.includes(tag)) score += 5; });
    // Title match
    if (title.includes(q)) score += 8;
    // Content match
    if (content.includes(q)) score += 3;
    // Word-level matching
    const words = q.split(/\s+/).filter(w => w.length > 2);
    words.forEach(word => {
      if (title.includes(word)) score += 2;
      if (content.includes(word)) score += 1;
      tags.forEach(tag => { if (tag.includes(word)) score += 3; });
    });

    return { item, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.item);
}

