import { View, Text, Pressable,StyleSheet } from 'react-native'
import React from 'react'
import { theme } from '@/constants/theme'

const Button = ({
  buttonStyle,
  textSytle,
  title='',
  onPress=()=>{},
  loading=false,
  hasShadow=true
}) => {
  const shadowStyle={

  }
  return (
    <Pressable onPress={onPress} style={[styles.button,buttonStyle,hasShadow && shadowStyle]}>
      <Text style={[styles.text,text]}>{title}</Text>
      </Pressable>
   
  )
}

export default Button
const styles =StyleSheet.create({
  button:{
backgroundColor:theme.colors.primary,
height:hp(6)
  }
})