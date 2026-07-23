import { View, Text } from 'react-native'
import React from 'react'
import { StyleSheet } from 'react-native'

const Button = ({
  buttonStyle,
  textSytle,
  title='',
  onPress=()=>{},
  hasShadow=
}) => {
  return (
    <View>
      <Text>Button</Text>
    </View>
  )
}

export default Button
const styles =StyleSheet.create({})