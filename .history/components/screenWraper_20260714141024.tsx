import { View, Text } from 'react-native'
import React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const screenWraper = ({children,bg}) => {
  const {
    top
  }=useSafeAreaInsets();
  const paddingTop=top>0? top+
  return (
    <View style ={{flex:1}}>
      <Text>screenWraper</Text>
    </View>
  )
}

export default screenWraper