import { View, StyleSheet, Image } from 'react-native'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import ScreenWrapper from '@/components/screenWrapper'
import { wp, hp } from '../helpers/common'

const Welcome = () => {
  return (
    <ScreenWrapper bg="white">
      <StatusBar style="dark" />

      <View style={styles.container}>
        <Image 
          style={styles.welcomeImage}
          resizeMode="contain"
          source={require('../assets/images/welcome.png')}
        />
        <View style ={{}}
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
  },

  welcomeImage: {
    height: hp(30),
    width: wp(100),
    alignSelf:'center',
  }
})