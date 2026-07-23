import { Text, Pressable, StyleSheet } from 'react-native'
import React from 'react'
import { theme } from '@/constants/theme'
import { hp } from '../helpers/common'

const Button = ({
  buttonStyle,
  textStyle,
  title = '',
  onPress = () => {},
  loading = false,
  hasShadow = true
}) => {

  const shadowStyle = {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  }

  return (
    <Pressable 
      onPress={onPress} 
      style={[styles.button, buttonStyle, hasShadow && shadowStyle]}
    >
      <Text style={[styles.text, textStyle]}>
        {loading ? 'Loading...' : title}
      </Text>
    </Pressable>
  )
}

export default Button

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    height: hp(6.6),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.xl
  },

  text: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  }
})