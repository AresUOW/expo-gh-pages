import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react-native';
import { colors, fonts } from '../theme';
import type { DisplayCat } from '../types/ui';
import { CatPhoto, StatusBadge } from './ui';
import { distanceLabel, timeAgo } from '../utils/display';
import { useAppStore } from '../store/useAppStore';

export default function CatCard({ cat }: { cat: DisplayCat }) {
  const [hovered, setHovered] = useState(false);
  const center = useAppStore(state => state.center);
  const selected = useAppStore(state => state.selectedId === cat.id);
  const open = useAppStore(state => state.openCat);
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${cat.name}, ${cat.area}`} onPress={() => open(cat.id)}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    style={[s.card, selected && { borderColor: '#EBC1A9', backgroundColor: '#FFFCF8' }, hovered && { borderColor: colors.orange }]}>
    <CatPhoto uri={cat.imageUrl} style={s.photo} />
    <View style={{ flex: 1, gap: 7 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={s.name} numberOfLines={1}>{cat.name}</Text><ArrowUpRight size={15} color="#A0A79B" />
      </View>
      <StatusBadge status={cat.status} small />
      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}><MapPin size={11} color={colors.muted} /><Text numberOfLines={1} style={s.area}>{cat.area}</Text></View>
      <Text style={s.time}>{distanceLabel(center, cat.location)}<Text style={{ color: '#C3C6BE' }}> · </Text>{timeAgo(cat.spottedAt)}</Text>
    </View>
  </Pressable>;
}
const s = StyleSheet.create({
  card: { padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: 'white', flexDirection: 'row', gap: 14, alignItems: 'center' },
  photo: { width: 91, height: 103, borderRadius: 10 },
  name: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, flex: 1 },
  area: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  time: { fontFamily: fonts.regular, fontSize: 10, color: '#8B9086' }
});
