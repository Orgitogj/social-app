import { View, Text, StyleSheet,Button } from 'react-native'
import React from 'react'
import ScreenWrapper from '../../components/screenWrapper'

const Home = () => {


  const {setAuth}=useAuth();

  const onLogout=async()=>{
setAuth(null);
const {error}
  }
  return (
    
    <ScreenWrapper>
      <Text>Home</Text>

      <Button title="Logout" onPress ={onLogout}/>
    </ScreenWrapper>
  )
}

export default Home

const styles =StyleSheet.create({})