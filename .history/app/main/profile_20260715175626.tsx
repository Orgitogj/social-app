import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import { useAuth } from '@/contexts/AuthContexts'
import { useRouter } from 'expo-router'
import Header from '@/components/Header'
import { wp,hp } from '@/helpers/common'
import { theme } from '@/constants/theme'
import Icon from '../../assets/icons'


const Profile = () => {
  const {user,setAuth}=useAuth();
  const router = useRouter();
  const handleLogout=async()=>{

  }
  return (
    <ScreenWrapper bg="white">
      <UserHeader user={user} router ={router} handleLogout={handleLogout}/>
    </ScreenWrapper>
  )
}



const UserHeader=({user,router,handleLogout})=>{
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


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  headerContainer: {
    marginHorizontal: wp(4),
    marginBottom: 20,
  },

  headerShape: {
    width: wp(100),
    height: hp(20),
  },

  avatarContainer: {
    height: hp(12),
    width: hp(12),
    alignSelf: 'center',
  },

  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: -12,
    padding: 7,
    borderRadius: 50,
    backgroundColor: 'white',
    shadowColor: theme.colors.textLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 7,
  },

  userName: {
    fontSize: hp(3),
    fontWeight: '500',
    color: theme.colors.textDark,
  },

  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutButton:{
    position:'absolute',
    right:0
  },
  listStyle:{
    paddingHorizontal:wp(4),
    paddingBottom:30
  },
  noPosts:{
    fontSize:hp(2),
    textAlign:'center',
    color:theme.colors.text

  }
});