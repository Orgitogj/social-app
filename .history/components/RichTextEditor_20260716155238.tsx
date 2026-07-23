import { View, Text,StyleSheet} from 'react-native'
import React from 'react'
import {Ric}


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