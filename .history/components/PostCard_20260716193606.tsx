import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const PostCard = ({
  item,
  currentUser,
  router,
  hasShadow=true,
}) => {

  const shadowStyle={
    shadowOffset:{
      width:0,
      height:2
    }

    ,
    shadowOpacity:0.06,
    shadowRadius:
  }
  return (
    <View>
      <Text>PostCard</Text>
    </View>
  )
}

export default PostCard

const styles = StyleSheet.create({})