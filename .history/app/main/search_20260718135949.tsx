import { View, Text, StyleSheet, Pressable, TextInput, FlatList } from 'react-native'
import React, { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ScreenWrapper from '../../components/screenWrapper'
import { useAuth } from '@/contexts/AuthContexts'
import { useRouter } from 'expo-router'
import { theme } from '@/constants/theme'
import { hp, wp } from '@/helpers/common'
import Icon from '@/assets/icons'
import { HugeiconsIcon } from '@hugeicons/react-native'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import Avatar from '@/components/Avatar'
import { searchUsers } from '@/services/userService'
import BackButton from '@/components/BackButton'

const RECENTS_KEY = 'recentProfileSearches'

type UserResult = {
  id: string
  name: string
  image?: string | null
}

const Search = () => {
  const { user } = useAuth()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [recents, setRecents] = useState<UserResult[]>([])

  useEffect(() => {
    loadRecents()
  }, [])

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([])
      return
    }
    const timeout = setTimeout(() => {
      runSearch(query.trim())
    }, 350)
    return () => clearTimeout(timeout)
  }, [query])

  const loadRecents = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENTS_KEY)
      if (stored) setRecents(JSON.parse(stored))
    } catch (e) {
      console.log('loadRecents error:', e)
    }
  }

  const saveRecents = async (updated: UserResult[]) => {
    setRecents(updated)
    try {
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(updated))
    } catch (e) {
      console.log('saveRecents error:', e)
    }
  }

  const runSearch = async (text: string) => {
    if (!user?.id) return
    const res = await searchUsers(text, user.id)
    if (res.success) setResults(res.data as UserResult[])
  }

  const addToRecents = (selected: UserResult) => {
    const filtered = recents.filter(r => r.id !== selected.id)
    saveRecents([selected, ...filtered].slice(0, 10))
  }

  const removeFromRecents = (id: string) => {
    saveRecents(recents.filter(r => r.id !== id))
  }

  const openProfile = (selected: UserResult) => {
    addToRecents(selected)
    router.push({ pathname: '/main/profile', params: { userId: selected.id } })
  }

  const renderRow = (item: UserResult, isRecent: boolean) => (
    <Pressable style={styles.row} onPress={() => openProfile(item)}>
      <Avatar uri={item?.image ?? undefined} size={hp(5)} rounded={theme.radius.sm} />
      <Text style={styles.name}>{item.name}</Text>
      {isRecent && (
        <Pressable
          onPress={() => removeFromRecents(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} color={theme.colors.textLight} />
        </Pressable>
      )}
    </Pressable>
  )

  const showingRecents = query.trim().length === 0

  return (
    <ScreenWrapper bg="white">
      <View style={styles.container}>
        <View style={styles.searchBar}>
          <Pressable onPress={() => router.back()}>
            <Icon name="arrowLeft" size={hp(2.8)} strokeWidth={2} color={theme.colors.text} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Kërko userat..."
            placeholderTextColor={theme.colors.textLight}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <HugeiconsIcon icon={Cancel01Icon} size={18} color={theme.colors.textLight} />
            </Pressable>
          )}
        </View>

        {showingRecents ? (
          <FlatList
            data={recents}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listStyle}
            ListHeaderComponent={
              recents.length > 0 ? <Text style={styles.sectionTitle}>Recents</Text> : null
            }
            renderItem={({ item }) => renderRow(item, true)}
            ListEmptyComponent={<Text style={styles.emptyText}>Asnjë kërkim i fundit</Text>}
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listStyle}
            renderItem={({ item }) => renderRow(item, false)}
            ListEmptyComponent={<Text style={styles.emptyText}>Asnjë user u gjet</Text>}
          />
        )}
      </View>
    </ScreenWrapper>
  )
}

export default Search

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray,
  },
  input: {
    flex: 1,
    fontSize: hp(1.9),
    color: theme.colors.text,
  },
  listStyle: {
    paddingTop: hp(1),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: hp(1.2),
  },
  name: {
    flex: 1,
    fontSize: hp(1.8),
    color: theme.colors.textDark,
  },
  sectionTitle: {
    fontSize: hp(1.6),
    color: theme.colors.textLight,
    marginTop: hp(1),
    marginBottom: hp(0.5),
  },
  emptyText: {
    textAlign: 'center',
    marginTop: hp(4),
    color: theme.colors.textLight,
  },
})