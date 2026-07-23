import { Stack } from "expo-router";
import {View,Text} from 'react-native'
import React, { useEffect } from 'react'

import {AuthProvider, useAuth} from '../contexts/AuthContexts'
import { supabase } from "../lib/supabase";
const _layout=()=>{
  return(
    <AuthProvider>
<MainLayout/>
    </AuthProvider>
  )
}
const MainLayout = () => {
  const { setAuth } = useAuth();

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
    console.log()
    });
  });

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
};


export  default _layout