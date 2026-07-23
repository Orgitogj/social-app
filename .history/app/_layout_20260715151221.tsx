import { Stack } from "expo-router";
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContexts';
import { supabase } from "../lib/supabase";

const _layout = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

const MainLayout = () => {
  const { setAuth } = useAuth();

  useEffect(() => {
    // Check current session on mount (handles cold start)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth(session);
    });

    // Listen for subsequent auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuth(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setAuth]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
};

export default _layout;