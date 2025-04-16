'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentUser, signOut } from '@/lib/supabase';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { user: currentUser, error } = await getCurrentUser();
        
        if (error) {
          throw error;
        }
        
        if (currentUser) {
          setUser({
            id: currentUser.id,
            email: currentUser.email || '',
            name: currentUser.user_metadata.name || '',
            role: currentUser.user_metadata.role || 'user',
          });
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { user: currentUser } = await getCurrentUser();
          if (currentUser) {
            setUser({
              id: currentUser.id,
              email: currentUser.email || '',
              name: currentUser.user_metadata.name || '',
              role: currentUser.user_metadata.role || 'user',
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          router.push('/');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const logout = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
      setUser(null);
      router.push('/');
    } catch (err) {
      console.error('Error logging out:', err);
      setError(err instanceof Error ? err : new Error('Failed to log out'));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
