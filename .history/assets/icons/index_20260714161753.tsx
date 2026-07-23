import React from 'react'
import { SvgProps } from 'react-native-svg'
import Home from './home'
import { theme } from '@/constants/theme' // rregulloje path-in sipas projektit tënd

const icons = {
  home: Home,
}

type IconName = keyof typeof icons

interface IconProps extends SvgProps {
  name: IconName
  size?: number
  strokeWidth?: number
}

const Icon = ({ name, ...props }: IconProps) => {
  const IconComponent = icons[name]

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`)
    return null
  }

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