import { View, Text } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import { useAuth } from '@/contexts/AuthContexts'
import { useRouter } from 'expo-router'

const Profile = () => {
  const {user,setAuth}=useAuth();
  const router = useRouter();
  return (
    <ScreenWrapper>
      <Text>Profile</Text>
    </ScreenWrapper>
  )
}



const UserHeader=({user,router})=>{
  return(
    <View style={{flex:1,backgroundColor:}}
  )
}
export default Profile