import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/screenWrapper';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { resetSchema } from '@/helpers/validation';

export default function ResetPassword() { const router = useRouter(); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState(''); const [loading, setLoading] = useState(false); const submit = async () => { const parsed = resetSchema.safeParse({ password, confirmation }); if (!parsed.success) return Alert.alert('Reset password', 'Use a 12 character password and enter it twice.'); setLoading(true); const { error } = await supabase.auth.updateUser({ password: parsed.data.password }); setLoading(false); if (error) Alert.alert('Reset password', 'Unable to update password.'); else { Alert.alert('Reset password', 'Your password was updated.'); router.replace('/main/home'); } }; return <ScreenWrapper bg="white"><View style={styles.container}><Text style={styles.title}>Choose a new password</Text><Input value={password} onChangeText={setPassword} placeholder="New password" secureTextEntry autoComplete="new-password" /><Input value={confirmation} onChangeText={setConfirmation} placeholder="Repeat password" secureTextEntry autoComplete="new-password" /><Button title="Update password" loading={loading} onPress={submit} /></View></ScreenWrapper>; }
const styles = StyleSheet.create({ container: { flex: 1, padding: 24, gap: 20 }, title: { fontSize: 28, fontWeight: '700' } });
