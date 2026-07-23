import { View, Text } from 'react-native'
import React from 'react'

const screenWraper = ({children,bg}) => {
  
  return (
    <View style ={{flex:1}}>
      <Text>screenWraper</Text>
    </View>
  )
}

export default screenWraper