import { View, Text, Pressable } from 'react-native'
import React from 'react'

const BackButton = ( {size=26}) => {
  return (
    <Pressable>
     <Icon name="arrowLeft" strokeWidth={2.5}  size={size}color ={theme.colors.text}
    </Pressable>
  )
}

export default BackButton