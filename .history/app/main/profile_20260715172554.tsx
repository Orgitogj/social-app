import { View, Text } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'

const Profile = () => {
  const {user,setAuth}=useAuth
  return (
    <ScreenWrapper>
      <Text>Profile</Text>
    </ScreenWrapper>
  )
}

export default Profile