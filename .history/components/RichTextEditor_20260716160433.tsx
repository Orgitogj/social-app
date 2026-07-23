import { View, StyleSheet } from 'react-native'
import React from 'react'
import { actions, RichToolbar } from 'react-native-pell-rich-editor'

interface RichTextEditorProps {
  editorRef: React.MutableRefObject<any>;
  onChange: (body: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  editorRef,
  onChange
}) => {
  return (
    <View style={{ minHeight: 285 }}>
      <RichToolbar
        actions={[
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
          actions.line,
          actions.heading1,
          actions.heading4
        ]}
        iconMap={{
          [actions.heading1]:({tintColor})=><Text style ={{}}
        }}
        style={styles.richBar}
        flatContainerStyle={styles.listStyle}
        editor={editorRef}
        disabled={false}
      />
    </View>
  )
}

export default RichTextEditor

const styles = StyleSheet.create({
  richBar: {
    borderTopRightRadius: 5,
    borderTopLeftRadius: 5,
    backgroundColor: '#f0f0f0',
  },
  listStyle: {
    paddingHorizontal: 8,
    gap: 3,
  },
})