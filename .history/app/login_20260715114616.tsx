import { View, Text, StyleSheet,Pressable} from 'react-native'
import React, { useState } from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import { theme } from '@/constants/theme'
import { StatusBar } from 'expo-status-bar'
import BackButton from '@/components/BackButton'
import { useRouter } from 'expo-router'
import { hp, wp } from '@/helpers/common'
import Input from '@/components/Input'
import Icon from '@/assets/icons'


import  {useRef} from 'react'
import Button from '@/components/Button'
const Login = () => {
  const router = useRouter();
  const emailRef=useRef("");
  const passwordRef=useRef("");
  const [loading,setLoading]=useState(false);


  const onSubmit= async()=>{
    if (!)

  }
  return (
    <ScreenWrapper  bg="white">
      <StatusBar style="dark" />
      <View style={styles.container}>
        <BackButton />
        <View>
          <Text style={styles.welcomeText}>Hey</Text>
          <Text style={styles.welcomeText}>Welcome Back</Text>
        </View>

        <View style={styles.form}>
          <Text
  style={{
    fontSize: hp(1.5),
    color: theme.colors.text,
  }}
>
  Please LogIn to continue
</Text>
          <Input icon={<Icon name="mail" size={26} strokeWidth={1.6}/>}
          placeholder='Enter your email'
          onChangeText={value=>{emailRef.current=value}}/>

           <Input icon={<Icon name="lock" size={26} strokeWidth={1.6}/>}
          placeholder='Enter your password'
          secureTextEntry
          onChangeText={value=>{passwordRef.current=value}}/>

          <Text style={styles.forgotPassword}>Forgot password?</Text>

         <Button title={'Login'} loading={loading } onPress={onSubmit} /> 
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Do not have an account?</Text>
          <Pressable>
            <Text style={[styles.footerText, { color: theme.colors.primaryDark, fontWeight: theme.fonts.semibold as any }]}>Signup</Text>
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  )
}

export default Login

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 45,
  paddingHorizontal:wp(5)
  },
welcomeText: {
    fontSize: hp(4),
    fontWeight: theme.fonts.bold as any,
    color: theme.colors.text,
},
form: {
    gap: 25,
},
forgotPassword: {
    textAlign: 'right',
    fontWeight: theme.fonts.semibold as any,
    color: theme.colors.text
},
footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
},
footerText: {
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: hp(1.6)
},
})