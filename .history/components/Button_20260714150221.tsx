import { View, Text, Pressable,StyleSheet } from 'react-native'
import React from 'react'

const Button = ({
  buttonStyle,
  textSytle,
  title='',
  onPress=()=>{},
  loading=false,
  hasShadow=true
}) => {
  const shadowStyle={

  }
  return (
    <Pressable onPress={onPress} style={[styles.button,buttonStyle,hasShadow && shadowStyle]}>
      <Text style={[styles.text,text]}>Butto</Text>
      </Pressable>
    <View>
      <Text>Button</Text>
    </View>
  )
}

export default Button
const styles =StyleSheet.create({
  button:{

  }
})