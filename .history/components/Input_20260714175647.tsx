import { View, Text, StyleSheet } from 'react-native'
import React from 'react'

const Input = (props) => {
  return (
    <View style={[styles.contianer,props.containerSytles && props.containerStyles]}>
      {
        props.icon && props.icon
      }
      <TextInput
    </View>
  )
}

export default Input

const styles =StyleSheet.create({})