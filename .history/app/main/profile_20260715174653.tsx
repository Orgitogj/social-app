import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import { useAuth } from '@/contexts/AuthContexts'
import { useRouter } from 'expo-router'
import Header from '@/components/Header'
import { wp } from '@/helpers/common'
import { theme } from '@/constants/theme'
import Icon from '../../assets/'


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
    <View style={{flex:1,backgroundColor:'white',paddingHorizontal:wp(4)}}>
     <View>
      <Header title="Profile" showBackButton={true}/>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name ="logout" color={theme.colors.rose}></Icon>
      </TouchableOpacity>
     </View>
    </View>
  )
}
export default Profile


const styles =StyleSheet.create({
  logoutButton:{

  }
})