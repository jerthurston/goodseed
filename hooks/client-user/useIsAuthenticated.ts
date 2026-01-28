'use client';

import { useFetchCurrentUser } from './useFetchCurrentUser';

/**
 * Quick hook to check if user is authenticated
 * 
 * Usage:
 * ```tsx
 * const { isAuthenticated, isLoading } = useIsAuthenticated();
 * 
 * if (isLoading) return <Spinner />;
 * if (!isAuthenticated) return <SignInButton />;
 * return <UserContent />;
 * ```
 */
export function useIsAuthenticated() {
  const { data, isLoading, error } = useFetchCurrentUser();

  return {
    isAuthenticated: !!data && !error,
    isLoading,
    error,
  };
}
