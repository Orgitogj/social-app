import { Stack } from "expo-router";
import {View,Text} from 'react-native'
import React from 'react'

import {AuthProvider} from '../contexts/AuthContexts'
const _layout=()=>{
  return(
    <AuthProvider>
<MainLayout/>
    </AuthProvider>
  )
}
const MainLayout =()=> {


  const {}
  return (
  <Stack 
  screenOptions={{
    headerShown:false
  }}/>
);
}


export  default _layout