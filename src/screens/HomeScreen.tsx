import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Cat, ChevronDown, Compass, Heart, List, LocateFixed, Map, MapPin, PawPrint, Plus, Search, SlidersHorizontal, UserRound } from 'lucide-react-native';
import * as Location from 'expo-location';
import { colors, fonts, statuses } from '../theme';
import { useAppStore, visibleCats } from '../store/useAppStore';
import { isDemo } from '../config/runtime';
import { KL_CENTER } from '../data/demo';
import { Button, ErrorText, IconButton } from '../components/ui';
import CatCard from '../components/CatCard';
import CatMap from '../components/CatMap';
import type { CatStatus } from '../types/models';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const mobile = width < 850;
  const state = useAppStore();
  const cats = useMemo(() => visibleCats(state), [state.cats, state.filter, state.search, state.center, state.radius]);
  const [mobileList, setMobileList] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radiusOpen, setRadiusOpen] = useState(false);
  const isKL = Math.abs(state.center.latitude - KL_CENTER.latitude) < .05 && Math.abs(state.center.longitude - KL_CENTER.longitude) < .05;
  async function locate() {
    setLocating(true); setLocationError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location access is off. You can still explore Kuala Lumpur.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await state.setCenter({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (error) { setLocationError(error instanceof Error ? error.message : 'Unable to find your location.'); }
    finally { setLocating(false); }
  }
  return <View style={s.page}>
    <View style={[s.header, mobile && { height: 72, paddingHorizontal: 20 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="KitoKato home" onPress={() => { state.setSearch(''); state.setFilter('all'); }} style={s.brand}>
        <View style={s.brandIcon}><Cat size={27} strokeWidth={1.9} color="white" /></View>
        <Text style={s.brandText}>kito<Text style={{ color: colors.orange }}>kato</Text><Text style={{ color: colors.orange, fontSize: 29 }}>.</Text></Text>
      </Pressable>
      {!mobile && <View style={s.navigation}>
        <View style={s.activeNav}><Compass size={17} color={colors.orange} /><Text style={[s.navText, { color: colors.orange }]}>Explore cats</Text></View>
        <Pressable accessibilityRole="button" onPress={() => state.open('about')} style={s.navItem}><Heart size={17} color={colors.muted} /><Text style={s.navText}>How it works</Text></Pressable>
      </View>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: mobile ? 8 : 20 }}>
        {isDemo && <Pressable accessibilityRole="button" accessibilityLabel="About this demo preview" onPress={() => state.open('about')} style={s.demoBadge}><View style={s.demoDot} /><Text style={s.demoText}>Demo preview</Text></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel={state.session ? 'Your account' : 'Sign in'} onPress={() => state.open('auth')} style={s.account}>
          <View style={s.avatar}>{state.session ? <Text style={s.avatarText}>{state.session.name[0].toUpperCase()}</Text> : <UserRound size={16} color={colors.green} />}</View>
          {!mobile && <Text style={[s.navText, { color: colors.ink }]}>{state.session?.name ?? 'Sign in'}</Text>}
        </Pressable>
      </View>
    </View>
    <View style={[s.intro, mobile && { paddingHorizontal: 20, paddingTop: 23, paddingBottom: 20 }]}>
      <View style={{ gap: 7, flex: 1 }}><View style={s.eyebrow}><View style={s.eyebrowLine} /><Text style={s.eyebrowText}>A LITTLE CURIOSITY. A LOT OF KINDNESS.</Text></View>
        <Text style={[s.title, mobile && { fontSize: 31, lineHeight: 39 }]}>Meet your neighbors<Text style={{ color: colors.orange }}>.</Text></Text>
        <Text style={[s.subtitle, mobile && { fontSize: 12 }]}>Every cat has a story. Be a part of theirs.</Text>
      </View>
      {!mobile && <Button title="Add a cat" onPress={() => state.open('add')} icon={<Plus size={18} color="white" />} style={{ paddingHorizontal: 23, height: 48 }} />}
    </View>
    <View style={[s.workspace, mobile && { paddingHorizontal: 0, paddingBottom: 0, gap: 0, flexDirection: 'column' }]}>
      <View style={[s.sidebar, mobile && { width: '100%', gap: 13, flex: mobileList ? 1 : undefined, paddingHorizontal: 20 }]}>
        <View style={s.search}><Search size={17} color="#9BA292" /><TextInput accessibilityLabel="Search cats or neighborhoods" placeholder="Search cats or neighborhoods" placeholderTextColor="#969D90" value={state.search} onChangeText={state.setSearch} style={s.searchInput} />
          {state.search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => state.setSearch('')}><Text style={{ color: colors.muted, padding: 4 }}>✕</Text></Pressable> : <SlidersHorizontal size={15} color="#8A9382" />}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 7, paddingBottom: 2 }}>
          {(['all', 'needs_help', 'being_cared_for', 'stray', 'adopted'] as const).map(filter => <Pressable key={filter} accessibilityRole="button" accessibilityState={{ selected: state.filter === filter }} onPress={() => state.setFilter(filter)}
            style={[s.filter, state.filter === filter && s.filterActive]}>
            {filter !== 'all' && <View style={{ width: 5, height: 5, borderRadius: 4, backgroundColor: state.filter === filter ? 'white' : statuses[filter].color }} />}
            <Text style={[s.filterText, state.filter === filter && { color: 'white' }]}>{filter === 'all' ? 'All cats' : statuses[filter].label}</Text>
          </Pressable>)}
        </ScrollView>
        <View style={s.listTitle}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Text style={s.listEyebrow}>LITTLE NEIGHBORS</Text><View style={s.count}><Text style={s.countText}>{cats.length}</Text></View></View>
          {mobile ? <Pressable accessibilityRole="button" onPress={() => setMobileList(!mobileList)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {mobileList ? <Map size={13} color={colors.green} /> : <List size={13} color={colors.green} />}<Text style={s.sortLabel}>{mobileList ? 'Map view' : 'List view'}</Text></Pressable>
            : <Text style={s.sortLabel}>Nearest first <ChevronDown size={11} color={colors.muted} /></Text>}
        </View>
        {(!mobile || mobileList) && <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 11, paddingBottom: 16 }} style={{ flex: 1 }}>
          <ErrorText text={state.error} />
          {state.loading && <View style={{ padding: 20 }}><ActivityIndicator color={colors.orange} /></View>}
          {cats.map(cat => <CatCard key={cat.id} cat={cat} />)}
          {!cats.length && !state.loading && <View style={s.empty}><Cat size={38} color="#A6AF9A" /><Text style={s.emptyTitle}>{!isDemo && !state.session ? 'Your neighborhood is waiting' : 'No little neighbors here yet'}</Text><Text style={s.emptyText}>{!isDemo && !state.session ? 'Sign in to explore cats shared by your community.' : 'Try a different search or radius, or add the first cat you’ve spotted.'}</Text>
            <Button title={!isDemo && !state.session ? 'Sign in' : 'Clear filters'} variant="secondary" onPress={() => { if (!isDemo && !state.session) state.open('auth'); else { state.setFilter('all'); state.setSearch(''); } }} />
            {isDemo && !isKL && <Button title="Back to sample neighborhood" variant="ghost" onPress={() => { void state.setCenter(KL_CENTER); }} />}
          </View>}
          {state.truncated && <Text style={s.emptyText}>More cats may be nearby. Try a smaller search radius.</Text>}
        </ScrollView>}
        {!mobile && <View style={s.sidebarFooter}><PawPrint size={13} color="#9AA38F" /><Text style={s.footerText}>A kinder neighborhood, one paw at a time.</Text></View>}
      </View>
      {(!mobile || !mobileList) && <View style={[s.mapFrame, mobile && { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, marginTop: 12 }]}>
        <CatMap cats={cats} center={state.center} selectedId={state.selectedId} onSelect={state.openCat} />
        <View pointerEvents="box-none" style={s.mapTop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Change search radius" onPress={() => setRadiusOpen(!radiusOpen)} style={s.locationPill}>
            <View style={s.locationIcon}><MapPin size={16} color={colors.green} /></View><View style={{ gap: 2 }}><Text style={s.locationTitle}>{isKL ? 'Bukit Bintang' : 'Your search area'}</Text><Text style={s.locationSubtitle}>{isKL ? 'Kuala Lumpur' : `${state.center.latitude.toFixed(3)}, ${state.center.longitude.toFixed(3)}`} · {state.radius / 1000} km radius</Text></View><ChevronDown size={14} color={colors.muted} />
          </Pressable>
          {!mobile && <View style={s.mapCount}><View style={[s.demoDot, { backgroundColor: '#6D8860' }]} /><Text style={s.mapCountText}>{cats.length} cats in this neighborhood</Text></View>}
        </View>
        {radiusOpen && <View style={s.radiusMenu}>{[500, 1000, 2000, 5000].map(radius => <Pressable key={radius} accessibilityRole="button" onPress={() => { void state.setRadius(radius); setRadiusOpen(false); }} style={s.radiusItem}><Text style={{ fontFamily: fonts.medium, color: state.radius === radius ? colors.orange : colors.ink, fontSize: 13 }}>{radius < 1000 ? '500 m' : `${radius / 1000} km`} radius {state.radius === radius ? '✓' : ''}</Text></Pressable>)}</View>}
        <View style={s.locateButton}><IconButton label="Use my current location" onPress={() => void locate()}>{locating ? <ActivityIndicator size="small" color={colors.green} /> : <LocateFixed size={19} color={colors.green} />}</IconButton></View>
        {locationError && <View style={s.mapError}><ErrorText text={locationError} /><Pressable accessibilityRole="button" onPress={() => setLocationError(null)}><Text style={{ textAlign: 'right', fontFamily: fonts.medium, fontSize: 11, color: colors.green }}>Dismiss</Text></Pressable></View>}
        {!mobile && <View pointerEvents="none" style={s.kindnessCard}><View style={s.kindnessIcon}><PawPrint size={22} color={colors.orange} strokeWidth={1.6} /></View><View style={{ gap: 4 }}><Text style={s.kindnessTitle}>Small acts. Happier cats.</Text><Text style={s.kindnessBody}>A photo, a sighting, a little care.<Text style={{ color: colors.orange }}> It all counts.</Text></Text></View></View>}
        {mobile && cats[0] && <View style={s.mobileCard}><CatCard cat={cats.find(cat => cat.id === state.selectedId) ?? cats[0]} /></View>}
        {!mobile && <View style={s.legend}>{(Object.keys(statuses) as CatStatus[]).map(status => <View key={status} style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}><View style={{ width: 6, height: 6, borderRadius: 4, backgroundColor: statuses[status].color }} /><Text style={s.legendLabel}>{statuses[status].label}</Text></View>)}</View>}
      </View>}
    </View>
    {mobile ? <View style={s.mobileNav}><Pressable accessibilityRole="button" onPress={() => setMobileList(false)} style={s.mobileNavItem}><Compass size={20} color={colors.orange} /><Text style={[s.mobileNavText, { color: colors.orange }]}>Explore</Text></Pressable><Button title="Add a cat" onPress={() => state.open('add')} icon={<Plus size={17} color="white" />} /><Pressable accessibilityRole="button" onPress={() => state.open('auth')} style={s.mobileNavItem}><UserRound size={20} color={colors.muted} /><Text style={s.mobileNavText}>Account</Text></Pressable></View>
      : <View style={s.bottomBar}><Text style={s.footerText}>For the cats. For the community. <Text style={{ color: colors.orange }}>With love.</Text></Text><Text style={s.footerText}>{isDemo ? 'Sample cats · Changes stay in this preview session' : 'Community sightings · Be gentle, give them space'}</Text></View>}
  </View>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, header: { height: 86, paddingHorizontal: 40, backgroundColor: 'white', borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', gap: 9, alignItems: 'center' }, brandIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' }, brandText: { fontFamily: fonts.bold, fontSize: 26, letterSpacing: -.9, color: colors.ink },
  navigation: { flexDirection: 'row', gap: 32, alignItems: 'center' }, navItem: { flexDirection: 'row', gap: 8, paddingVertical: 12, alignItems: 'center' }, activeNav: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#FFF4ED', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 15 }, navText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  demoBadge: { flexDirection: 'row', gap: 6, backgroundColor: '#F3F4EE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignItems: 'center' }, demoDot: { width: 5, height: 5, borderRadius: 5, backgroundColor: '#9BA78C' }, demoText: { fontFamily: fonts.medium, color: '#79846D', fontSize: 10 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 8 }, avatar: { width: 34, height: 34, borderWidth: 1, borderColor: '#E4E8DC', backgroundColor: '#F4F6F0', borderRadius: 30, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontFamily: fonts.bold, color: colors.green, fontSize: 13 },
  intro: { paddingHorizontal: 40, paddingTop: 29, paddingBottom: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, eyebrowLine: { width: 17, height: 1, backgroundColor: colors.orange }, eyebrowText: { fontFamily: fonts.semibold, fontSize: 8, letterSpacing: 1.5, color: '#8C937F' },
  title: { fontFamily: fonts.bold, fontSize: 39, lineHeight: 48, letterSpacing: -1.2, color: colors.ink }, subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  workspace: { flex: 1, minHeight: 0, flexDirection: 'row', paddingHorizontal: 40, paddingBottom: 3, gap: 25 }, sidebar: { width: 338, gap: 15 },
  search: { height: 47, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 }, searchInput: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.regular, fontSize: 11, color: colors.ink, outlineWidth: 0 },
  filter: { paddingHorizontal: 11, height: 32, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', gap: 5 }, filterActive: { backgroundColor: colors.green, borderColor: colors.green }, filterText: { fontFamily: fonts.medium, color: '#7B8373', fontSize: 10 },
  listTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2, paddingBottom: 1 }, listEyebrow: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.2, color: '#818978' }, count: { backgroundColor: '#EAEEE2', width: 20, height: 18, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }, countText: { fontFamily: fonts.semibold, fontSize: 9, color: colors.green }, sortLabel: { fontFamily: fonts.regular, color: '#9BA292', fontSize: 10 },
  sidebarFooter: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7 }, footerText: { fontFamily: fonts.regular, fontSize: 9, color: '#9AA18F' },
  mapFrame: { flex: 1, minHeight: 0, backgroundColor: '#E9EDE2', overflow: 'hidden', borderRadius: 19, borderWidth: 1, borderColor: '#E1E5DA' }, mapTop: { position: 'absolute', top: 18, left: 18, right: 18, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  locationPill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: 'white', boxShadow: '0 3px 15px #2630250d' }, locationIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#F0F4EB', justifyContent: 'center', alignItems: 'center' }, locationTitle: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink }, locationSubtitle: { fontFamily: fonts.regular, fontSize: 9, color: '#959D8B' },
  mapCount: { backgroundColor: '#FFFFFFF0', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }, mapCountText: { fontFamily: fonts.medium, fontSize: 9, color: '#78856D' },
  locateButton: { position: 'absolute', top: 94, right: 19, backgroundColor: 'white', borderRadius: 11, boxShadow: '0 2px 12px #2630250b' }, radiusMenu: { position: 'absolute', top: 85, left: 18, backgroundColor: 'white', padding: 7, borderRadius: 12, boxShadow: '0 3px 15px #26302520', width: 185 }, radiusItem: { paddingVertical: 12, paddingHorizontal: 10 },
  kindnessCard: { position: 'absolute', bottom: 51, left: 20, backgroundColor: '#FFFFFFF2', flexDirection: 'row', gap: 11, padding: 15, borderRadius: 13, alignItems: 'center', boxShadow: '0 3px 15px #2630250a' }, kindnessIcon: { width: 42, height: 42, backgroundColor: '#FFF1E7', borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, kindnessTitle: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink }, kindnessBody: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted },
  legend: { position: 'absolute', bottom: 14, left: 20, flexDirection: 'row', gap: 15, backgroundColor: '#FFFFFFE8', paddingVertical: 8, paddingHorizontal: 13, borderRadius: 8 }, legendLabel: { fontFamily: fonts.medium, fontSize: 8, color: '#8B9482' }, mapError: { position: 'absolute', top: 140, right: 18, left: 18, backgroundColor: 'white', padding: 8, borderRadius: 12 },
  mobileCard: { position: 'absolute', left: 16, right: 16, bottom: 26, boxShadow: '0 4px 20px #26302515', borderRadius: 15 },
  bottomBar: { paddingHorizontal: 40, height: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, mobileNav: { flexDirection: 'row', paddingHorizontal: 28, paddingVertical: 11, alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: colors.border, backgroundColor: 'white' }, mobileNavItem: { alignItems: 'center', gap: 4, width: 57 }, mobileNavText: { fontFamily: fonts.medium, fontSize: 9, color: colors.muted },
  empty: { padding: 23, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 15, gap: 14, alignItems: 'center', backgroundColor: 'white' }, emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, textAlign: 'center', color: colors.ink }, emptyText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 20, textAlign: 'center', color: colors.muted }
});
