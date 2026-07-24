import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

export type AuthProviderType = 'google' | 'phone' | 'email';

export interface User {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  provider: AuthProviderType;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: async () => {}
});

const isDev = import.meta.env.DEV;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Map Supabase user to our internal User format
  const mapSupabaseUser = (sbUser: SupabaseUser | null): User | null => {
    if (!sbUser) return null;
    return {
      id: sbUser.id,
      name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'Driver',
      email: sbUser.email,
      mobile: sbUser.phone,
      provider: sbUser.app_metadata?.provider === 'google' ? 'google' : 
                sbUser.phone ? 'phone' : 'email'
    };
  };

  useEffect(() => {
    if (isDev) console.log('[Auth] Initializing Supabase session...');

    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error && isDev) console.error('[Auth] getSession error:', error.message);
      if (isDev) console.log('[Auth] getSession result:', session ? 'Session found' : 'No session');
      
      setUser(mapSupabaseUser(session?.user ?? null));
      setIsLoading(false);
    });

    // 2. Listen for auth changes (including email callbacks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isDev) console.log(`[Auth] Event: ${event}`, session ? 'User present' : 'No user');

      switch (event) {
        case 'INITIAL_SESSION':
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
        case 'PASSWORD_RECOVERY':
          setUser(mapSupabaseUser(session?.user ?? null));
          setIsLoading(false);
          break;
        case 'SIGNED_OUT':
          setUser(null);
          setIsLoading(false);
          break;
        default:
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    if (isDev) console.log('[Auth] User requested logout');
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error && isDev) console.error('[Auth] Logout error:', error.message);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
