import { StyleSheet, Text, View } from 'react-native'
import React, { useState } from 'react'
import { useLocalSearchParams } from 'expo-router'

const PostDetails = () => {

  const {postId}=useLocalSearchParams();

  const [post,setPost]=useState()
  return (
    <View>
      <Text>P</Text>
    </View>
  )
}

export default PostDetails

const styles = StyleSheet.create({})