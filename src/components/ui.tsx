import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { Cat as CatIcon } from 'lucide-react-native';
import { colors, fonts, statuses } from '../theme';
import type { CatStatus } from '../types/models';

export function Button({ title, onPress, icon, variant = 'primary', loading = false, disabled = false, style }: {
  title: string; onPress: () => void; icon?: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; loading?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  const [hovered, setHovered] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} disabled={disabled || loading}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    style={({ pressed }) => [ui.button, variant === 'primary' ? ui.primary : variant === 'secondary' ? ui.secondary : ui.ghost,
      hovered && { opacity: .87 }, pressed && { transform: [{ scale: .98 }] }, (disabled || loading) && { opacity: .5 }, style]}>
    {loading ? <ActivityIndicator size="small" color={variant === 'primary' ? 'white' : colors.ink} /> : icon}
    <Text style={[ui.buttonLabel, { color: variant === 'primary' ? 'white' : colors.ink }]}>{title}</Text>
  </Pressable>;
}
export function IconButton({ label, onPress, children, style }: { label: string; onPress: () => void; children: ReactNode; style?: ViewStyle }) {
  const [hovered, setHovered] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    style={[ui.iconButton, hovered && { backgroundColor: colors.background }, style]}>{children}</Pressable>;
}
export function StatusBadge({ status, small = false }: { status: CatStatus; small?: boolean }) {
  const info = statuses[status];
  return <View style={[ui.badge, { backgroundColor: info.background }, small && { paddingVertical: 4, paddingHorizontal: 8 }]}>
    <View style={{ width: 5, height: 5, borderRadius: 5, backgroundColor: info.color }} />
    <Text style={{ fontFamily: fonts.semibold, fontSize: small ? 10 : 12, color: info.color }}>{info.label}</Text>
  </View>;
}
export function CatPhoto({ uri, style }: { uri: string | null; style?: ViewStyle }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return <View style={[{ overflow: 'hidden', backgroundColor: '#EEECE3', alignItems: 'center', justifyContent: 'center' }, style]}>
    {uri && !failed ? <Image accessibilityLabel="Cat photo" source={{ uri }} resizeMode="cover" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} />
      : <CatIcon size={40} strokeWidth={1.4} color="#A8AE9D" />}
  </View>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 8, flex: 1 }}><Text style={ui.label}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor="#A0A59C" {...props} style={[ui.input, props.multiline && { height: 112, paddingTop: 13, textAlignVertical: 'top' }, props.style]} />
  </View>;
}
export function ErrorText({ text }: { text: string | null }) {
  return text ? <View accessibilityRole="alert" style={ui.error}><Text style={{ color: colors.error, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 }}>{text}</Text></View> : null;
}
export const ui = StyleSheet.create({
  button: { minHeight: 46, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primary: { backgroundColor: colors.orange }, secondary: { backgroundColor: 'white', borderWidth: 1, borderColor: colors.border }, ghost: { backgroundColor: 'transparent' },
  buttonLabel: { fontFamily: fonts.semibold, fontSize: 13 },
  iconButton: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  input: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 14, fontFamily: fonts.regular, color: colors.ink, fontSize: 14, backgroundColor: 'white', outlineWidth: 0 },
  error: { padding: 12, borderRadius: 10, backgroundColor: '#FEF0ED' },
  heading: { fontFamily: fonts.bold, fontSize: 29, lineHeight: 36, color: colors.ink, letterSpacing: -.7 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 23, color: colors.muted }
});
