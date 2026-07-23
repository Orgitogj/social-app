import { View, Text, StyleSheet, StatusBar } from 'react-native'
import React from 'react'
import ScreenWrapper from '@/components/screenWrapper'

const Welcome = () => {
  return (
    <ScreenWrapper bg="white">
  <StatusBar style="dark"/>
  <View style={styles.container}></View>

    </ScreenWrapper>
  )
}

export default Welcome

const styles = StyleSheet.create({
  container:{
    flex:1,
    alignItems:'center',
    
  }
})