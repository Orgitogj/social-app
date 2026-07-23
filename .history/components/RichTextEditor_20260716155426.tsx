import { View, Text,StyleSheet} from 'react-native'
import React from 'react'
import {actions, RichToolbar} from 'react-native-pell-rich-editor'


const RichTextEditor = ({
  editorRef,
  onChange
}) => {
  return (
    <View style={{minHeight:285}}>
      <RichToolbar actions={[
        actions.setStrikethrough,
        actions.removeFormat,
        actions.setBold,
        actions.setItalic,
        actions.
      ]}></RichToolbar>
    </View>
  )
}

export default RichTextEditor