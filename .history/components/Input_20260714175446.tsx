import { View, Text } from 'react-native'
import React from 'react'

const Input = (props) => {
  return (
    <View style={styles.contianer,props.containerSytles &&}>
      <Text>Input</Text>
    </View>
  )
}

export default Input