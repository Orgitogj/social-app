import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect, useRef, useState } from 'react'
import {AuthProvider, useAuth} from '../contexts/AuthContexts'
import { supabase } from "../lib/supabase";
import type { User } from '@supabase/supabase-js';
import {getUserData} from "../services/userService"

const _layout=()=>{

  return(
    <AuthProvider>
<MainLayout/>
    </AuthProvider>
  )
}

const MainLayout = () => {
  const { authUser, setAuth,setUserData } = useAuth();
  const [ready, setReady] = useState(false);
  const requestId = useRef(0);
  const router=useRouter();
  const segments = useSegments();

  useEffect(() => {
    let active = true;
    const update = async (session: User | null) => {
    const currentRequest = ++requestId.current;
    if (session){
       setAuth(session)
       await updateUserData(session, currentRequest);
    }
    else{
       setAuth(null)
       setUserData(null)
    }
    if (active && currentRequest === requestId.current) setReady(true);
    };
    supabase.auth.getSession().then(({ data }) => update(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION' || event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') update(session?.user ?? null);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  },[router,setAuth,setUserData])

  useEffect(() => {
    if (!ready) return;
    const inApp = segments[0] === 'main';
    const hasSession = !!authUser;
    if (inApp && !hasSession) router.replace('/welcome');
    if (!inApp && hasSession && segments[0] !== 'main') router.replace('/main/home');
  }, [ready, segments, router, authUser]);

const updateUserData = async (user: User, currentRequest: number) => {
  let res = await getUserData(user.id);

  if (res.success && requestId.current === currentRequest) {
    setUserData(res.data);
  }
};
  if (!ready) return null;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
      name="main/postDetails"
      options={{
        presentation:'modal'
      }}
      />
      </Stack>
  )
};


export  default _layout
