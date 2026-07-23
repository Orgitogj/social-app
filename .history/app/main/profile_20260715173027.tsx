import { View, Text } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import { useAuth } from '@/contexts/AuthContexts'
import { useRouter } from 'expo-router'

const Profile = () => {
  const {user,setAuth}=useAuth();
  const router = useRouter();
  return (
    <ScreenWrapper bg="white">
      <UserHeader user={user} router ={router}/>
    </ScreenWrapper>
  )
}



const UserHeader=({user,router})=>{
  return(
    <View style={{flex:1,backgroundColor:'white'}}>
     <View>
      
     </View>
    </View>
  )
}
export default Profile