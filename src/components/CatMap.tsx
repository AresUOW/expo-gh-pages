import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { CatPhoto } from './ui';
import { colors, fonts, statuses } from '../theme';
import type { CatMapProps } from './CatMap.types';
export default function CatMap({ cats, center, selectedId, onSelect }: CatMapProps) {
  const map = useRef<MapView>(null);
  useEffect(() => { map.current?.animateToRegion({ ...center, latitudeDelta: .025, longitudeDelta: .025 }); }, [center.latitude, center.longitude]);
  return <MapView ref={map} provider={PROVIDER_GOOGLE} style={{ flex: 1 }}
    initialRegion={{ ...center, latitudeDelta: .025, longitudeDelta: .025 }} showsCompass={false} showsPointsOfInterests={false}>
    {cats.map(cat => <Marker key={cat.id} coordinate={cat.location} title={cat.name} onPress={() => onSelect(cat.id)}>
      <View style={{ alignItems: 'center', gap: 4 }}><View style={{ padding: 3, borderRadius: 40, backgroundColor: cat.id === selectedId ? colors.orange : 'white' }}>
        <CatPhoto uri={cat.imageUrl} style={{ width: 47, height: 47, borderRadius: 40 }} />
        <View style={{ position: 'absolute', bottom: 2, right: 1, borderWidth: 2, borderColor: 'white', borderRadius: 8, width: 13, height: 13, backgroundColor: statuses[cat.status].color }} />
      </View><Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.ink, backgroundColor: 'white', borderRadius: 6, padding: 3 }}>{cat.name}</Text></View>
    </Marker>)}
    <Marker coordinate={center} title="Search center"><View style={{ width: 16, height: 16, borderWidth: 3, borderColor: 'white', borderRadius: 15, backgroundColor: '#718ED4' }} /></Marker>
  </MapView>;
}
