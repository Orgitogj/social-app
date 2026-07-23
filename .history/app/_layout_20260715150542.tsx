import { Stack } from "expo-router";
import {View,Text} from 'react-native'
import React from 'react'

import {AuthPro}
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