import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { setCurrentUserId } from '@/lib/db/knowledgeBaseDb';
import { setAuthTokenGetter } from '@/lib/api/client';
import { useResumeStore } from '@/stores/useResumeStore';

/**
 * AuthSync — Syncs the Clerk userId and session token to the storage/API layers.
 *
 * When a user logs in, this component:
 * 1. Sets the userId on the knowledgeBaseDb module (scopes localStorage keys)
 * 2. Registers a token getter so lib/api/client.ts can attach Authorization headers
 * 3. Reloads the knowledge base and version history (backend-first, localStorage fallback)
 *
 * Render this inside <ClerkProvider> but outside routes.
 */
export const AuthSync = () => {
  const { user, isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const loadKnowledgeBase = useResumeStore((s) => s.loadKnowledgeBase);
  const loadVersions = useResumeStore((s) => s.loadVersions);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    const userId = isSignedIn && user ? user.id : null;

    // Only act when userId actually changes
    if (userId !== prevUserId.current) {
      prevUserId.current = userId;

      if (userId) {
        // Set the user-scoped storage key
        setCurrentUserId(userId);
        // The Zustand persist middleware already rehydrated from the
        // unscoped/previous key at module load time — re-run it now that
        // the storage key is user-scoped, so latexContent/versions load
        // from the right localStorage entry.
        useResumeStore.persist.rehydrate();
        // Reload KB/versions — backend-first (per Phase A2), falls back to
        // user-scoped localStorage if the backend is unreachable.
        loadKnowledgeBase();
        loadVersions();
      } else {
        // Logged out — reset to default
        setCurrentUserId('');
        useResumeStore.persist.rehydrate();
      }
    }
  }, [isLoaded, isSignedIn, user, loadKnowledgeBase, loadVersions]);

  return null; // Render nothing — this is a side-effect-only component
};
