import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import { theme } from '@/constants/theme'
import { hp } from '@/helpers/common'
import {Image} from 'expo-image'
const Avatar = ({
  uri,
  size=hp(4.5),
  rounded=theme.radius.md,
  sytle={

  }
}) => {

  return (
   <Image
   source={{uri}}
   transition={100}
   style={[styles.avtar,{height:size,width:size,borderRadius:rounded},sytle]}/>
  )
}

export default Avatar


const styles=StyleSheet.create({
  avatar:{
    borderCurve:'continuous',
    borderColor:
  }
})