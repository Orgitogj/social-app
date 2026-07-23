import React from 'react'
import Home from './home'
import { theme } from '../../constants/theme'
import { StyleSheet } from 'react-native'

const icons: { [key: string]: any } = {
  home: Home,
}

const Icon = ({ name, ...props }: any) => {
  const IconComponent = icons[name];
  return (
    <IconComponent
      height={props.size || 24}
      width={props.size || 24}
      strokeWidth={props.strokeWidth || 1.9}
      color={theme.colors.textLight}
      {...props}
    />
  )
}

export default Icon


const styles =StyleSheet.create({})