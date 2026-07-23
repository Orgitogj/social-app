import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import ScreenWrapper from '../../components/screenWrapper'

const Home = () => {
  return (
    
    <ScreenWrapper>
      <Text>Home</Text>

      <Button title="Logout" onPress ={onLog}
    </ScreenWrapper>
  )
}

export default Home

const styles =StyleSheet.create({})