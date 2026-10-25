import { useEffect, useRef } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Camera, Check, MapPin, MessageCircle, PawPrint, X } from 'lucide-react-native';
import HomeScreen from './src/screens/HomeScreen';
import AddCatScreen from './src/screens/AddCatScreen';
import AuthScreen from './src/screens/AuthScreen';
import CatDetailScreen from './src/screens/CatDetailScreen';
import { useAppStore } from './src/store/useAppStore';
import { colors, fonts } from './src/theme';
import { Button, IconButton, ui } from './src/components/ui';
import { isDemo } from './src/config/runtime';
function AppContent() {
  const [fontsLoaded, fontError] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold });
  const modal = useAppStore(state => state.modal);
  const open = useAppStore(state => state.open);
  const notice = useAppStore(state => state.notice);
  const dismiss = useAppStore(state => state.dismissNotice);
  const { width, height } = useWindowDimensions();
  const mobile = width < 850;
  const priorModal = useRef(modal);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.title = 'KitoKato — Meet your neighborhood cats';
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape') open(null); };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [open]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (useAppStore.getState().modal) { open(null); return true; }
      return false;
    });
    return () => sub.remove();
  }, [open]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(dismiss, 5500);
    return () => clearTimeout(timer);
  }, [notice, dismiss]);
  useEffect(() => {
    if (isDemo) return;
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      const [{ auth }, { onAuthStateChanged }] = await Promise.all([import('./src/services/firebase'), import('firebase/auth')]);
      if (!alive) return;
      unsubscribe = onAuthStateChanged(auth, user => {
        useAppStore.setState({ session: user ? { uid: user.uid, name: user.displayName || user.email?.split('@')[0] || 'Neighbor', email: user.email ?? undefined } : null });
        if (user) void useAppStore.getState().loadCats();
      });
    })().catch(error => { if (alive) useAppStore.setState({ error: error instanceof Error ? error.message : 'Unable to connect to Firebase.' }); });
    return () => { alive = false; unsubscribe?.(); };
  }, []);
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (modal && !priorModal.current) window.history.pushState({ kitokatoModal: true }, '', window.location.href);
      if (!modal && priorModal.current && window.history.state?.kitokatoModal) window.history.back();
      const back = () => { if (useAppStore.getState().modal) open(null); };
      window.addEventListener('popstate', back);
      priorModal.current = modal;
      return () => window.removeEventListener('popstate', back);
    }
  }, [modal, open]);
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.orange} /></View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
    <StatusBar style="dark" /><HomeScreen />
    <Modal visible={Boolean(modal)} transparent animationType="fade" onRequestClose={() => open(null)} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.overlay, mobile && { padding: 0, paddingTop: 45, justifyContent: 'flex-end' }]}>
        <Pressable accessibilityLabel="Close dialog" onPress={() => open(null)} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[s.sheet, { maxHeight: height - (mobile ? 45 : 64), width: mobile ? '100%' : modal === 'auth' ? 470 : 560 }, mobile && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
          <View style={s.sheetHeader}><View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}><PawPrint size={14} color={colors.orange} /><Text style={s.sheetLabel}>{modal === 'add' ? 'A NEW LITTLE NEIGHBOR' : modal === 'detail' ? 'CAT PROFILE' : modal === 'auth' ? 'YOUR NEIGHBORHOOD' : 'A LITTLE ABOUT KITOKATO'}</Text></View><IconButton label="Close" onPress={() => open(null)}><X size={19} color={colors.muted} /></IconButton></View>
          {modal === 'add' ? <AddCatScreen /> : modal === 'detail' ? <CatDetailScreen /> : modal === 'auth' ? <AuthScreen /> : modal === 'about' ? <AboutScreen /> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
    {notice && <View accessibilityRole="alert" style={[s.toast, { bottom: mobile ? 85 : 22, maxWidth: width - 30 }]}><Check size={17} color={colors.green} /><Text style={s.toastText}>{notice}</Text><IconButton label="Dismiss notification" onPress={dismiss} style={{ width: 24, height: 24 }}><X size={14} color={colors.muted} /></IconButton></View>}
  </SafeAreaView>;
}
function AboutScreen() {
  const open = useAppStore(state => state.open);
  return <View style={{ padding: 28, gap: 22 }}><Text style={ui.heading}>Every cat deserves a neighborhood.</Text><Text style={ui.body}>KitoKato is a little field guide to the cats around us. Together, we can make sure they’re seen, known, and cared for.</Text>
    {[{ icon: Camera, title: 'Spot a little neighbor', body: 'Share a photo, a location, and a few helpful details.' }, { icon: MapPin, title: 'Get to know the neighborhood', body: 'Explore the map and meet the cats living nearby.' }, { icon: MessageCircle, title: 'Keep each other in the loop', body: 'Leave a note or update a status when something changes.' }].map(({ icon: Icon, title, body }) => <View key={title} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}><View style={s.aboutIcon}><Icon size={21} color={colors.orange} /></View><View style={{ flex: 1, gap: 4 }}><Text style={ui.label}>{title}</Text><Text style={[ui.body, { fontSize: 12, lineHeight: 19 }]}>{body}</Text></View></View>)}
    {isDemo && <View style={{ padding: 16, backgroundColor: '#F4F6EE', borderRadius: 12 }}><Text style={[ui.body, { fontSize: 12 }]}>You’re exploring a demo with sample cats and photos. Your changes stay in this session. Firebase hasn’t been connected, so no real accounts or public reports are created.</Text></View>}
    <Button title="Let’s explore" onPress={() => open(null)} />
  </View>;
}
export default function App() { return <SafeAreaProvider><AppContent /></SafeAreaProvider>; }
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#17231662', alignItems: 'center', justifyContent: 'center', padding: 24 }, sheet: { backgroundColor: 'white', borderRadius: 22, overflow: 'hidden', boxShadow: '0 16px 70px #18231530', flexShrink: 1 }, sheetHeader: { height: 61, paddingLeft: 24, paddingRight: 13, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sheetLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.4, color: '#88937C' }, toast: { position: 'absolute', alignSelf: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 13, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 9, boxShadow: '0 5px 30px #26302515', zIndex: 100 }, toastText: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink, flexShrink: 1, lineHeight: 18 }, aboutIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: '#FFF0E5', alignItems: 'center', justifyContent: 'center' }
});
