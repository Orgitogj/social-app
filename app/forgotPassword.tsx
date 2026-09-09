import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/screenWrapper';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BackButton from '@/components/BackButton';
import { supabase } from '@/lib/supabase';
import { emailSchema } from '@/helpers/validation';

export default function ForgotPassword() {
  const router = useRouter(); const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async () => { const parsed = emailSchema.safeParse(email); if (!parsed.success) return Alert.alert('Reset password', 'Enter a valid email address.'); setLoading(true); const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${process.env.EXPO_PUBLIC_SITE_URL ?? ''}/resetPassword` }); setLoading(false); if (error) Alert.alert('Reset password', 'Unable to send the reset email.'); else Alert.alert('Reset password', 'Check your email for a reset link.'); };
  return <ScreenWrapper bg="white"><KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><BackButton /><Text style={styles.title}>Reset your password</Text><Input value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" autoComplete="email" /><Button title="Send reset email" loading={loading} onPress={submit} /><Button title="Back to login" hasShadow={false} onPress={() => router.replace('/login')} /></KeyboardAvoidingView></ScreenWrapper>;
}
const styles = StyleSheet.create({ container: { flex: 1, padding: 24, gap: 24 }, title: { fontSize: 28, fontWeight: '700' } });
