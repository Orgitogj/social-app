import { View, Text, Pressable } from 'react-native'
import React from 'react'
import { StyleSheet } from 'react-native'

const Button = ({
  buttonStyle,
  textSytle,
  title='',
  onPress=()=>{},
  loading=false,
  hasShadow=true
}) => {
  return (
    <Pressable onPress={onPress} style={[styles.button,]}
    <View>
      <Text>Button</Text>
    </View>
  )
}

export default Button
const styles =StyleSheet.create({})