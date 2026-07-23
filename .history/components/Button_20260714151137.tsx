import { Text, Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import React from 'react'
import { theme } from '@/constants/theme'
import { hp } from '../helpers/common'

interface ButtonProps {
  buttonStyle?: ViewStyle;
  textStyle?: TextStyle;
  title?: string;
  onPress?: () => void;
  loading?: boolean;
  hasShadow?: boolean;
}

const Button = ({
  buttonStyle,
  textStyle,
  title = '',
  onPress = () => {},
  loading = false,
  hasShadow = true
}: ButtonProps) => {

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
    fontSize: hp(2.5),
    fontWeight:
  }
})