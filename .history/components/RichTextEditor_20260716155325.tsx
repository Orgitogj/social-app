import { View, Text,StyleSheet} from 'react-native'
import React from 'react'
import {RichToolbar} from 'react-native-pell-rich-editor'


const RichTextEditor = ({
  editorRef,
  onChange
}) => {
  return (
    <View style={{minHeight:285}}>
      <RichToolbar actions></RichToolbar>
    </View>
  )
}

export default RichTextEditor