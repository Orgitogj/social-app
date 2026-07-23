import { Stack } from "expo-router";
import {View,Text} from 'react-native'
import React from 'react'


export default function RootLayout() {
  return <Stack 
  screenOptions={{
    headerShown:false
  }}/>;
}
