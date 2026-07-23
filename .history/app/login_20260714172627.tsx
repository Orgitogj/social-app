import { View, Text,StyleSheet } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import { theme } from '@/constants/theme'
import Icon from '../assets/icons'
import { StatusBar } from 'expo-status-bar'
const Login = () => {
  return (
    <ScreenWrapper>

      <StatusBar style="dark"/>
      <View style={styles.container}></View>
     <BackButton></BackButton>
    </ScreenWrapper>
  )
}

export default Login



const styles=StyleSheet.create({})