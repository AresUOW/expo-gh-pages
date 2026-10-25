import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Cat, LogOut, PawPrint } from 'lucide-react-native';
import { Button, ErrorText, Field, ui } from '../components/ui';
import { colors, fonts } from '../theme';
import { isDemo } from '../config/runtime';
import { useAppStore } from '../store/useAppStore';
export default function AuthScreen() {
  const state = useAppStore();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setBusy(true); setError(null);
    const result = await state.authenticate(email, password, signup);
    if (!result.success) setError(result.error ?? 'Unable to sign in.');
    setBusy(false);
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
    <View style={s.illustration}><View style={s.circle}><Cat size={67} color={colors.orange} strokeWidth={1.1} /></View><PawPrint size={18} color="#B0BA9E" style={{ position: 'absolute', top: 24, right: 90, transform: [{ rotate: '20deg' }] }} /><PawPrint size={13} color="#E6C5A7" style={{ position: 'absolute', bottom: 24, left: 93, transform: [{ rotate: '-25deg' }] }} /></View>
    <View style={{ gap: 9, alignItems: 'center' }}><Text style={[ui.heading, { textAlign: 'center' }]}>{state.session ? `Hey, ${state.session.name}.` : signup ? 'A kinder world starts here.' : 'Hello, fellow cat person.'}</Text><Text style={[ui.body, { textAlign: 'center', fontSize: 13 }]}>{state.session ? 'Thanks for looking out for the little neighbors.' : 'Join your neighbors in looking out for the cats around you.'}</Text></View>
    {state.session ? <><View style={s.demoInfo}><Text style={[ui.label, { textAlign: 'center' }]}>{isDemo ? 'Demo explorer account' : state.session.email}</Text><Text style={[ui.body, { fontSize: 12, textAlign: 'center' }]}>{isDemo ? 'Your cats, comments, and updates stay in this preview session.' : 'Your contributions help your neighborhood stay connected.'}</Text></View><Button title="Keep exploring" onPress={() => state.open(null)} /><Button title="Sign out" variant="ghost" icon={<LogOut size={15} color={colors.ink} />} onPress={() => void state.signOut()} /></>
      : isDemo ? <><View style={s.demoInfo}><Text style={[ui.label, { textAlign: 'center' }]}>Take a little look around.</Text><Text style={[ui.body, { fontSize: 12, textAlign: 'center' }]}>This is a working preview with sample cats. No account or password needed. Try posting a cat, leaving a note, or updating a status.</Text></View><Button title="Continue as a demo explorer" icon={<ArrowRight size={17} color="white" />} onPress={state.enterDemo} /><Text style={s.finePrint}>Firebase isn’t connected yet. No real account will be created.</Text></>
        : <><Field label="Email address" placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" /><Field label="Password" placeholder={signup ? 'At least 8 characters' : 'Your password'} value={password} onChangeText={setPassword} secureTextEntry autoComplete={signup ? 'new-password' : 'current-password'} onSubmitEditing={() => void submit()} />
          <ErrorText text={error} /><Button title={signup ? 'Create account' : 'Sign in'} onPress={() => void submit()} loading={busy} /><Pressable accessibilityRole="button" onPress={() => { setSignup(!signup); setError(null); }}><Text style={s.switch}>{signup ? 'Already a neighbor? Sign in' : 'New to the neighborhood? Create an account'}</Text></Pressable></>}
  </ScrollView>;
}
const s = StyleSheet.create({
  content: { padding: 30, paddingTop: 12, gap: 24, paddingBottom: 40 }, illustration: { height: 150, alignItems: 'center', justifyContent: 'center' }, circle: { width: 125, height: 125, borderRadius: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF2E7' }, demoInfo: { padding: 19, backgroundColor: '#F5F7EF', gap: 9, borderRadius: 13 }, finePrint: { fontFamily: fonts.regular, fontSize: 10, textAlign: 'center', color: colors.muted, lineHeight: 17 }, switch: { fontFamily: fonts.medium, fontSize: 12, textAlign: 'center', color: colors.orange }
});
