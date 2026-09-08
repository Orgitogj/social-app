import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/domain';

type AuthContextValue = { authUser: User | null; user: Profile | null; setAuth: (value: User | null) => void; setUserData: (value: Profile | null) => void };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [user, setProfile] = useState<Profile | null>(null);
  const value = useMemo(() => ({ authUser, user, setAuth: setAuthUser, setUserData: setProfile }), [authUser, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
