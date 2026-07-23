import { Stack, useRouter } from "expo-router";
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
  const router=useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
    console.log('session user:',session?.user?.id);

    if (session){
       setAuth(session?.user)
       updateUserData(session?.user);
       router.replace('/main/home')

    }
    else{
       setAuth(null)
       router.replace('/welcome')
    }
    })
  },[])

  const updateUserData=async(user)=>{
    let res=await getUserData(user?id)
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
};


export  default _layout