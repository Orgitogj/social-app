import { View, StyleSheet, Image,Text, Pressable } from 'react-native'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import ScreenWrapper from '@/components/screenWrapper'
import { wp, hp } from '../helpers/common'
import {theme} from '../constants/theme'
import Button  from '../components/Button'
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
        <View style ={{gap:20}}>
          <Text style ={styles.title}>Linkup</Text>
          <Text style ={styles.punchline}>Where every thought finds a home and every  image tells a story </Text>
        </View>

        <View style={styles.footer}>
          <Button
          title="Getting started"
          buttonStyle={{marginHorizontal:wp(3)}}
          onPress={()=>{}}/>

          <View style={styles.bottomTextContainer}>
            <Text style={styles.loginText}>Already have an Account?</Text>
            <Pressable>
              <Text style={styles.loginText}>Log in</Text>
            </Pressable>
          </View>
        </View>
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
  paddingHorizontal: wp(4),
  paddingVertical: hp(10),
},

  welcomeImage: {
    height: hp(30),
    width: wp(100),
    alignSelf:'center',
  },
  title:{
    color:theme.colors.text,
    fontSize:hp(4),
    textAlign:'center',
  },
  punchline:{
    textAlign:'center',
    paddingHorizontal:wp(10),
    fontSize:hp(1.7),
    color:theme.colors.text
  },
  footer:{
    gap:15,
    width:'100%'

  },
  bottomTextContainer:{
    flexDirection:'row',
    justifyContent:'center',
    alignItems:'center',
    gap:5
  },
  loginText:{
    textAlign:'center',
    color
  }
})