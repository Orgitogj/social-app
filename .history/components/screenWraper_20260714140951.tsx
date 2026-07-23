import { View, Text } from 'react-native'
import React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const screenWraper = ({children,bg}) => {
  const {
    top
  }=useSafeAreaInsets()
  return (
    <View style ={{flex:1}}>
      <Text>screenWraper</Text>
    </View>
  )
}

export default screenWraper