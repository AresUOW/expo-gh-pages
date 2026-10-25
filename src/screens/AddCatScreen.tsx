import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera, ImagePlus, LocateFixed, MapPin, PawPrint } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Button, ErrorText, Field, ui } from '../components/ui';
import { colors, fonts, statuses } from '../theme';
import { useAppStore } from '../store/useAppStore';
import type { CatStatus, ImageInput } from '../types/models';
import { isDemo } from '../config/runtime';

export default function AddCatScreen() {
  const center = useAppStore(state => state.center);
  const saveCat = useAppStore(state => state.saveCat);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CatStatus>('stray');
  const [latitude, setLatitude] = useState(center.latitude.toFixed(6));
  const [longitude, setLongitude] = useState(center.longitude.toFixed(6));
  const [photo, setPhoto] = useState<{ image: ImageInput; uri: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [retryId, setRetryId] = useState<string | undefined>();
  async function pickPhoto() {
    setError(null); setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: .85 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 25 * 1024 * 1024) throw new Error('Please choose a photo smaller than 25 MiB.');
      const context = ImageManipulator.manipulate(asset.uri);
      if (asset.width > 1600) context.resize({ width: 1600 });
      const rendered = await context.renderAsync();
      const output = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: .82 });
      let image: ImageInput;
      if (Platform.OS === 'web') {
        const blob = await (await fetch(output.uri)).blob();
        if (blob.size > 5 * 1024 * 1024) throw new Error('The photo is still too large. Please choose a smaller one.');
        image = { blob, contentType: 'image/jpeg' };
      } else image = { uri: output.uri, contentType: 'image/jpeg' };
      setPhoto({ image, uri: output.uri });
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to open this photo.'); }
    finally { setPicking(false); }
  }
  async function locate() {
    setLocating(true); setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission was not granted. Enter the coordinates below instead.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(position.coords.latitude.toFixed(6)); setLongitude(position.coords.longitude.toFixed(6));
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to find your location.'); }
    finally { setLocating(false); }
  }
  async function submit() {
    if (!photo) { setError('Add a photo so neighbors can recognize this cat.'); return; }
    if (!latitude.trim() || !longitude.trim()) { setError('Enter both latitude and longitude.'); return; }
    setBusy(true); setError(null);
    const result = await saveCat({ description, status, location: { latitude: Number(latitude), longitude: Number(longitude) }, image: photo.image, previewUri: photo.uri }, retryId);
    if (!result.success) {
      setError(result.pending ? `The cat was saved, but the photo needs another try. ${result.error}` : result.error ?? 'Unable to save this cat.');
      if (result.pending) setRetryId(result.id);
    }
    setBusy(false);
  }
  return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={{ gap: 7 }}><Text style={ui.heading}>Spotted a little neighbor?</Text><Text style={ui.body}>A photo and a few details can make a big difference.</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={photo ? 'Change cat photo' : 'Choose a cat photo'} onPress={() => void pickPhoto()} disabled={picking || busy} style={[s.upload, photo && { padding: 0, height: 220 }]}>
      {photo ? <><Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%', borderRadius: 14 }} resizeMode="cover" /><View style={s.changePhoto}><Camera size={14} color="white" /><Text style={s.changePhotoText}>Change photo</Text></View></>
        : <><View style={s.uploadIcon}><ImagePlus size={28} color={colors.orange} strokeWidth={1.5} /></View><Text style={s.uploadTitle}>{picking ? 'Preparing your photo…' : 'Give this cat a face'}</Text><Text style={s.hint}>Choose a photo from your library</Text><Text style={[s.hint, { fontSize: 10, color: '#A7AC9F' }]}>We’ll resize it for you · JPEG, PNG, or HEIC</Text></>}
    </Pressable>
    <Field label="Tell us about this cat" placeholder="Mochi. An orange tabby who loves the sunny spot outside the café…" multiline maxLength={1000} value={description} onChangeText={setDescription} editable={!retryId && !busy} />
    <Text style={[s.hint, { marginTop: -15 }]}>Start with a name if you know one. {description.length}/1,000</Text>
    <View style={{ gap: 10 }}><Text style={ui.label}>How are they doing?</Text><View style={s.statusGrid}>{(Object.keys(statuses) as CatStatus[]).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: status === value }} disabled={Boolean(retryId) || busy} onPress={() => setStatus(value)} style={[s.statusOption, status === value && { borderColor: statuses[value].color, backgroundColor: statuses[value].background }]}>
      <View style={[s.radio, status === value && { borderColor: statuses[value].color, borderWidth: 5 }]} /><Text style={{ fontFamily: fonts.medium, fontSize: 12, color: status === value ? statuses[value].color : colors.muted }}>{statuses[value].label}</Text>
    </Pressable>)}</View></View>
    <View style={{ gap: 12 }}><View style={s.locationHeading}><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><MapPin size={15} color={colors.green} /><Text style={ui.label}>Where did you spot them?</Text></View><Pressable accessibilityRole="button" onPress={() => void locate()} disabled={locating || busy || Boolean(retryId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><LocateFixed size={13} color={colors.orange} /><Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.orange }}>{locating ? 'Locating…' : 'Use my location'}</Text></Pressable></View>
      <View style={{ flexDirection: 'row', gap: 12 }}><Field label="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="numbers-and-punctuation" editable={!retryId && !busy} /><Field label="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="numbers-and-punctuation" editable={!retryId && !busy} /></View>
      <Text style={s.hint}>Starts at the map’s search center. Adjust to the actual sighting.</Text>
    </View>
    <ErrorText text={error} />
    <Button title={retryId ? 'Retry photo upload' : 'Add this little neighbor'} icon={<PawPrint size={17} color="white" />} onPress={() => void submit()} loading={busy} disabled={picking} />
    <Text style={[s.hint, { textAlign: 'center', fontSize: 10 }]}>{isDemo ? 'Demo only — your cat will be added to this preview session.' : 'Share sightings thoughtfully. Never disturb or put a cat at risk.'}</Text>
  </ScrollView>;
}
const s = StyleSheet.create({
  content: { padding: 27, gap: 22, paddingBottom: 35 }, upload: { padding: 23, height: 204, borderWidth: 1, borderStyle: 'dashed', borderColor: '#E4CAB4', borderRadius: 15, backgroundColor: '#FFFAF5', alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' },
  uploadIcon: { width: 55, height: 55, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0E2', borderRadius: 18 }, uploadTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }, hint: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, lineHeight: 17 },
  changePhoto: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9, borderRadius: 9, backgroundColor: '#252D26B0' }, changePhotoText: { color: 'white', fontFamily: fonts.medium, fontSize: 11 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, statusOption: { minWidth: '46%', flexGrow: 1, flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }, radio: { width: 16, height: 16, borderWidth: 1, borderColor: '#CAD0C2', borderRadius: 10 }, locationHeading: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }
});
