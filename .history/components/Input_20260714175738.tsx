import { View, Text, StyleSheet, TextInput } from 'react-native'
import React from 'react'
import { theme } from '@/constants/theme'
const Input = (props) => {
  return (
    <View style={[styles.contianer,props.containerSytles && props.containerStyles]}>
      {
        props.icon && props.icon
      }
      <TextInput style={{flex:1}}
      placeholder={theme.colors.textLight}
    </View>
  )
}

export default Input

const styles =StyleSheet.create({})