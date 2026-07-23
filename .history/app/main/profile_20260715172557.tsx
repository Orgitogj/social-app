import { View, Text } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import { useAuth } from '@/contexts/AuthContexts'

const Profile = () => {
  const {user,setAuth}=useAuth()
  return (
    <ScreenWrapper>
      <Text>Profile</Text>
    </ScreenWrapper>
  )
}

export default Profile