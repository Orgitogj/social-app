import { View, StyleSheet, TextInput, TextInputProps, ViewStyle, StyleProp } from 'react-native'
import React from 'react'
import { theme } from '@/constants/theme'
import { hp } from '@/helpers/common'

interface InputProps extends TextInputProps {
  icon?: React.ReactNode
  containerStyle?: StyleProp<ViewStyle>
  inputRef?: React.RefObject<TextInput | null>
}

const Input = ({ icon, containerStyle, inputRef, style, ...inputProps }: InputProps) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {icon}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={theme.colors.textLight}
        ref={inputRef}
        {...inputProps}
      />
    </View>
  )
}

export default Input

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: hp(7.2),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.4,
    borderColor: theme.colors.text,
    borderRadius: theme.radius.xxl,
    borderCurve: 'continuous',
    paddingHorizontal: 18,
    gap: 12,
  },
  input: { flex: 1 },
})
