import { Stack, useRouter } from "expo-router";
import React, { useEffect } from 'react'
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
  const { setAuth,setUserData } = useAuth();
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

const updateUserData = async (user: User) => {
  let res = await getUserData(user.id);

  console.log("User data response:", res);

  if (res.success) {
    console.log("User data:", res.data);
    setUserData(res.data);
  } else {
    console.log("Error getting user data:", res.msg);
  }
};
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
      name="(main)/po"
      options={{
        presentation:'modal'
      }}
      </Stack>
  )
};


export  default _layout