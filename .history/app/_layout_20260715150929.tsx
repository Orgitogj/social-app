import { Stack } from "expo-router";
import {View,Text} from 'react-native'
import React, { useEffect } from 'react'

import {AuthProvider, useAuth} from '../contexts/AuthContexts'
const _layout=()=>{
  return(
    <AuthProvider>
<MainLayout/>
    </AuthProvider>
  )
}
const MainLayout =()=> {


  const {setAuth}=useAuth();

  useEffect(()=>)
  return (
  <Stack 
  screenOptions={{
    headerShown:false
  }}/>
);
}


export  default _layout