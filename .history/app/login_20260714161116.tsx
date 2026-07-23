import { View, Text } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import Home from '../assets/icons/home'
const Login = () => {
  return (
    <ScreenWrapper>
      <Text>Login</Text>
      <Home strokeWidth={2}color=''/>
    </ScreenWrapper>
  )
}

export default Login