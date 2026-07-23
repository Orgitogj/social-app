import { View, Text } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'

const Header = ({title,showBackButton=false,mb=10}) => {
  const router = useRouter();

  return (
    <View style={
      sty
    }>
      <Text>Header</Text>
    </View>
  )
}

export default Header