import { View, Text } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import { theme } from '@/constants/theme'
import Icon from '../assets/icons'
import { StatusBar } from 'expo-status-bar'
const Login = () => {
  return (
    <ScreenWrapper>

      <StatusBar style=''
      <Text>Login</Text>
     <Icon name ="home" color="red"/>
    </ScreenWrapper>
  )
}

export default Login