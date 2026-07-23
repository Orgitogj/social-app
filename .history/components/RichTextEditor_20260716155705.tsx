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
        actions.insertOrderedList,
        actions.blockquote,
        actions.alignLeft,
        actions.alignRight,
        actions.alignRight,
        actions.code,
        actions.line
      ]}
      style={styles.richBar}
      flatContainerStyle={styles.<div class="list-group">
        <a href="#" class="list-group-item list-group-item-action active">Active item</a>
        <a href="#" class="list-group-item list-group-item-action">Item</a>
        <a href="#" class="list-group-item list-group-item-action disabled">Disabled item</a>
      </div>}
      
      ></RichToolbar>
    </View>
  )
}

export default RichTextEditor


const styles=StyleSheet.create({

})