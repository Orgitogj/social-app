import { View, Text, StyleSheet,Button,Alert } from 'react-native'
import React from 'react'
import ScreenWrapper from '../../components/screenWrapper'
import { supabase } from '@/lib/supabase';
import

const Home = () => {


  const {setAuth}=useAuth();

  const onLogout=async()=>{
setAuth(null);
const {error}=await supabase.auth.signOut();

if(error){
  Alert.alert
}
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