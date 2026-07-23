import { View, Text } from 'react-native'
import React from 'react'
import { theme } from '@/constants/theme'
import { hp } from '@/helpers/common'
import {Image} from 
const Avatar = ({
  uri,
  size=hp(4.5),
  rounded=theme.radius.md,
  sytle={

  }
}) => {

  return (
   <Image
  )
}

export default Avatar