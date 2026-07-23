import { View, Text } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import { HugeiconsIcon } from '@hugeicons/react-native'
import { Home03Icon } from '@hugeicons/core-free-icons'

const Login = () => {
  return (
    <ScreenWrapper>
      <Text>Login</Text>
      <HugeiconsIcon icon={Home03Icon} size={24} color="#000" />
    </ScreenWrapper>
  )
}

export default Login