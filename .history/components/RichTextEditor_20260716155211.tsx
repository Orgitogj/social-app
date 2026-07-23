import { View, Text } from 'react-native'
import React from 'react'

const RichTextEditor = ({
  editorRef,
  onChange
}) => {
  return (
    <View style={{minHeight:285}}>
      <RichToolbar></RichToolbar>
    </View>
  )
}

export default RichTextEditor