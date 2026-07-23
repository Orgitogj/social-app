import { View, StyleSheet } from 'react-native'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import ScreenWrapper from '@/components/screenWrapper'
import { wp } from '../helpers/common'

const Welcome = () => {
  return (
    <ScreenWrapper bg="white">
      <StatusBar style="dark" />

      <View style={styles.container}>
        <Image style={styles.welcomeImage}  resizeMode ='conta source={'../assets/images/welcome.png'}
      </View>

    </ScreenWrapper>
  )
}

export default Welcome

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: wp(4)
  }
})