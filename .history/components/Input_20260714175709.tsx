import { View, Text, StyleSheet, TextInput } from 'react-native'
import React from 'react'

const Input = (props) => {
  return (
    <View style={[styles.contianer,props.containerSytles && props.containerStyles]}>
      {
        props.icon && props.icon
      }
      <TextInput style={{flex:1}}
    </View>
  )
}

export default Input

const styles =StyleSheet.create({})