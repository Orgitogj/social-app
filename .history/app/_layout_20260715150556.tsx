import { Stack } from "expo-router";
import {View,Text} from 'react-native'
import React from 'react'

import {AuthProvider} from '../contexts/AuthContexts'
const _layout=()=>{
  return(
    <AuthProvider>

    </AuthProvider>
  )
}
const MainLayout =()=> {
  return (
  <Stack 
  screenOptions={{
    headerShown:false
  }}/>
);
}


export 