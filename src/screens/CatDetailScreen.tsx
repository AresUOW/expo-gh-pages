import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowUpRight, Clock3, HeartHandshake, MapPin, MessageCircle, Send, UserRound } from 'lucide-react-native';
import { Button, CatPhoto, ErrorText, StatusBadge, ui } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { colors, fonts, statuses } from '../theme';
import { distanceLabel, timeAgo } from '../utils/display';
import type { CatStatus } from '../types/models';
export default function CatDetailScreen() {
  const state = useAppStore();
  const cat = state.cats.find(item => item.id === state.selectedId);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [status, setStatus] = useState<CatStatus>(cat?.status ?? 'stray');
  useEffect(() => { setStatus(cat?.status ?? 'stray'); }, [cat?.status, cat?.id]);
  if (!cat) return <View style={{ padding: 30, gap: 20 }}><ErrorText text="This cat is no longer in your current search. Close this profile and refresh the map." /><Button title="Back to the map" onPress={() => state.open(null)} /></View>;
  const comments = state.comments.filter(item => item.catId === cat.id).sort((a, b) => b.createdAt - a.createdAt);
  async function post() {
    if (!cat || posting) return;
    if (!state.session) { state.open('auth'); return; }
    setPosting(true); setError(null);
    const result = await state.postComment(cat.id, comment);
    if (result.success) setComment(''); else setError(result.error ?? 'Unable to post comment.');
    setPosting(false);
  }
  async function updateStatus() {
    if (!cat || savingStatus) return;
    setSavingStatus(true); setError(null);
    const result = await state.changeStatus(cat.id, status);
    if (result.success) setEditingStatus(false); else setError(result.error ?? 'Unable to update status.');
    setSavingStatus(false);
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 25 }}>
    <View><CatPhoto uri={cat.imageUrl} style={{ width: '100%', height: 272 }} /><View style={s.photoBadge}><StatusBadge status={cat.status} /></View></View>
    <View style={s.content}>
      <View style={{ gap: 8 }}><View style={s.row}><Text style={[ui.heading, { fontSize: 34 }]}>{cat.name}</Text><View style={s.idBadge}><Text style={s.idText}>NEIGHBORHOOD CAT</Text></View></View>
        <View style={s.meta}><MapPin size={13} color={colors.green} /><Text style={s.metaText}>{cat.area}</Text><Text style={{ color: '#CDD0C7' }}>·</Text><Text style={s.metaText}>{distanceLabel(state.center, cat.location)}</Text></View>
      </View>
      <Text style={s.description}>{cat.description.startsWith(`${cat.name}.`) ? cat.description.slice(cat.name.length + 1).trim() : cat.description}</Text>
      <View style={s.reporter}><View style={s.avatar}><Text style={s.avatarLetter}>{cat.author[0]}</Text></View><View style={{ flex: 1, gap: 3 }}><Text style={s.reporterName}>Shared by {cat.author}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Clock3 size={10} color={colors.muted} /><Text style={s.metaText}>Last updated {timeAgo(cat.spottedAt).toLowerCase()}</Text></View></View><HeartHandshake size={21} color="#9FAF92" strokeWidth={1.4} /></View>
      <View style={s.careBox}><View style={{ flex: 1, gap: 4 }}><Text style={s.sectionTitle}>A little update goes a long way.</Text><Text style={s.metaText}>Know how {cat.name} is doing? Let the neighbors know.</Text></View><Pressable accessibilityRole="button" onPress={() => { if (!state.session) state.open('auth'); else setEditingStatus(!editingStatus); }} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}><Text style={s.orangeLink}>Update</Text><ArrowUpRight size={14} color={colors.orange} /></Pressable></View>
      {editingStatus && <View style={{ gap: 12 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(Object.keys(statuses) as CatStatus[]).map(value => <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === status }} key={value} onPress={() => setStatus(value)} style={[s.statusChoice, status === value && { borderColor: statuses[value].color, backgroundColor: statuses[value].background }]}><Text style={{ fontFamily: fonts.medium, fontSize: 12, color: statuses[value].color }}>{statuses[value].label}</Text></Pressable>)}</View><Button title="Save status update" onPress={() => void updateStatus()} loading={savingStatus} disabled={status === cat.status} /></View>}
      <View style={s.divider} />
      <View style={[s.row, { justifyContent: 'flex-start', gap: 8 }]}><MessageCircle size={18} color={colors.green} /><Text style={s.sectionTitle}>Neighborhood notes</Text><Text style={s.commentCount}>{comments.length}{state.commentsMore ? '+' : ''}</Text></View>
      <Text style={[ui.body, { fontSize: 12, marginTop: -13 }]}>Sightings, little updates, and a little love.</Text>
      <ErrorText text={error ?? state.commentsError} />
      {state.session ? <View style={s.composer}><TextInput accessibilityLabel="Write a neighborhood note" placeholder={`Have an update about ${cat.name}?`} placeholderTextColor="#9BA292" value={comment} onChangeText={setComment} multiline maxLength={1000} style={s.commentInput} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={s.metaText}>Keep it kind. Keep it helpful.</Text><Pressable accessibilityRole="button" accessibilityLabel="Post comment" disabled={!comment.trim() || posting} onPress={() => void post()} style={[s.send, (!comment.trim() || posting) && { opacity: .45 }]}>{posting ? <ActivityIndicator size="small" color="white" /> : <Send size={15} color="white" />}</Pressable></View></View>
        : <Button title="Sign in to leave a note" variant="secondary" icon={<UserRound size={15} color={colors.green} />} onPress={() => state.open('auth')} />}
      {state.commentsLoading && <ActivityIndicator color={colors.orange} />}
      {comments.map(item => <View key={item.id} style={s.comment}><View style={[s.avatar, { backgroundColor: '#F0EEE7' }]}><Text style={s.avatarLetter}>{item.name[0].toUpperCase()}</Text></View><View style={{ flex: 1, gap: 7 }}><View style={s.row}><Text style={s.reporterName}>{item.name}</Text><Text style={s.metaText}>{timeAgo(item.createdAt)}</Text></View><Text style={s.commentBody}>{item.text}</Text></View></View>)}
      {!comments.length && !state.commentsLoading && !state.commentsError && <Text style={[ui.body, { textAlign: 'center', fontSize: 12, paddingVertical: 13 }]}>No notes yet. Be the first to say hello.</Text>}
      {state.commentsMore && <Button title="Load more notes" variant="ghost" loading={state.commentsLoading} onPress={() => void state.loadComments(cat.id, true)} />}
    </View>
  </ScrollView>;
}
const s = StyleSheet.create({
  content: { padding: 27, gap: 21 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, photoBadge: { position: 'absolute', left: 24, bottom: 19 },
  idBadge: { paddingVertical: 6, paddingHorizontal: 9, backgroundColor: '#F1F3EB', borderRadius: 6 }, idText: { fontFamily: fonts.semibold, letterSpacing: 1, fontSize: 7, color: '#87917A' }, meta: { flexDirection: 'row', alignItems: 'center', gap: 6 }, metaText: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, lineHeight: 15 },
  description: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 24, color: '#67705F' }, reporter: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 35, height: 35, borderRadius: 25, backgroundColor: '#EDF1E5', alignItems: 'center', justifyContent: 'center' }, avatarLetter: { fontFamily: fonts.semibold, color: '#798967', fontSize: 13 }, reporterName: { fontFamily: fonts.semibold, color: colors.ink, fontSize: 11 },
  careBox: { padding: 16, backgroundColor: '#F7F8F2', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, sectionTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }, orangeLink: { fontFamily: fonts.semibold, fontSize: 11, color: colors.orange }, statusChoice: { borderWidth: 1, borderColor: colors.border, borderRadius: 9, padding: 10 }, divider: { height: 1, backgroundColor: colors.border }, commentCount: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  composer: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, gap: 9 }, commentInput: { fontFamily: fonts.regular, color: colors.ink, fontSize: 12, minHeight: 52, textAlignVertical: 'top', outlineWidth: 0 }, send: { width: 34, height: 32, borderRadius: 9, backgroundColor: colors.orange, justifyContent: 'center', alignItems: 'center' }, comment: { flexDirection: 'row', gap: 11, paddingVertical: 4 }, commentBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 21, color: '#7A8273' }
});
