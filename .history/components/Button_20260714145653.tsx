import { View, Text } from 'react-native'
import React from 'react'
import Sry

const Button = ({
  buttonStyle,
  textSytle,
  title='',
  onPress=()=>{}
}) => {
  return (
    <View>
      <Text>Button</Text>
    </View>
  )
}

export default Button
const styles =StyleSheet.create({})