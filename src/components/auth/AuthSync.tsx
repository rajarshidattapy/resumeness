import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/react';
import { setCurrentUserId } from '@/lib/db/knowledgeBaseDb';
import { useResumeStore } from '@/stores/useResumeStore';

/**
 * AuthSync — Syncs the Clerk userId to the storage layer.
 * 
 * When a user logs in, this component:
 * 1. Sets the userId on the knowledgeBaseDb module (scopes localStorage keys)
 * 2. Reloads the knowledge base from user-scoped storage
 * 
 * Render this inside <ClerkProvider> but outside routes.
 */
export const AuthSync = () => {
  const { user, isSignedIn, isLoaded } = useUser();
  const loadKnowledgeBase = useResumeStore((s) => s.loadKnowledgeBase);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const userId = isSignedIn && user ? user.id : null;

    // Only act when userId actually changes
    if (userId !== prevUserId.current) {
      prevUserId.current = userId;

      if (userId) {
        // Set the user-scoped storage key
        setCurrentUserId(userId);
        // Reload KB from user-scoped localStorage
        loadKnowledgeBase();
      } else {
        // Logged out — reset to default
        setCurrentUserId('');
      }
    }
  }, [isLoaded, isSignedIn, user, loadKnowledgeBase]);

  return null; // Render nothing — this is a side-effect-only component
};
