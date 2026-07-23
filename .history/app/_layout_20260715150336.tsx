import { Stack } from "expo-router";
import {View,Text} from 'react-native'
import React
export default function RootLayout() {
  return <Stack 
  screenOptions={{
    headerShown:false
  }}/>;
}
