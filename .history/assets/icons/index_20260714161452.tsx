import { View, Text } from 'react-native'
import React from 'react'
import Home from './home'


const icons ={
  home:Home,
}
const Icon = ({name,...props}) => {
  const IconComponent =icons[name]
  return (
    <View>
      <Text>Icon</Text>
    </View>
  )
}

export default Icon