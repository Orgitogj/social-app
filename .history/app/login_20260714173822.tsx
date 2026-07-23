import { TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'
import Icon from '../assets/icons'
import { theme } from '@/constants/theme'

interface BackButtonProps {
  size?: number
  router: ReturnType<typeof useRouter>
}

const BackButton = ({ size = 26, router }: BackButtonProps) => {
  return (
    <TouchableOpacity onPress={() => router.back()} style={styles.button}>
      <Icon name="arrowLeft" strokeWidth={2.5} size={size} color={theme.colors.text} />
    </TouchableOpacity>
  )
}

export default BackButton

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    padding: 5,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
})