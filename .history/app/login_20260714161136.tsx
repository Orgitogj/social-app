import { View, Text } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import Home from '../assets/icons/home'
import { theme } from '@/constants/theme'
const Login = () => {
  return (
    <ScreenWrapper>
      <Text>Login</Text>
      <Home strokeWidth={2}color='theme.colors.primary'/>
    </ScreenWrapper>
  )
}

export default Login