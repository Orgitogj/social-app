import { View, Text } from 'react-native'
import React from 'react'
 import theme
const Loading = ({size="large",color=theme.colors.primary}) => {
  return (
    <View>
      <Text>Loading</Text>
    </View>
  )
}

export default Loading