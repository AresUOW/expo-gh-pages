import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';
import { statuses } from '../theme';
import type { CatMapProps } from './CatMap.types';

export default function CatMap({ cats, center, selectedId, onSelect }: CatMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const select = useRef(onSelect); select.current = onSelect;
  const searchCenter = useRef(center); searchCenter.current = center;
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { center: [center.latitude, center.longitude], zoom: 15, zoomControl: false, scrollWheelZoom: false, attributionControl: true });
    map.current = instance;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19
    }).addTo(instance);
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    markers.current = L.layerGroup().addTo(instance);
    const observer = new ResizeObserver(() => {
      instance.invalidateSize({ pan: false });
      instance.setView([searchCenter.current.latitude, searchCenter.current.longitude], 15, { animate: false });
    });
    observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);
  useEffect(() => { map.current?.setView([center.latitude, center.longitude], 15); }, [center.latitude, center.longitude]);
  useEffect(() => {
    const group = markers.current;
    if (!group || !map.current) return;
    group.clearLayers();
    L.circle([center.latitude, center.longitude], { radius: 95, color: '#7B91B8', weight: 1, fillColor: '#90A9D0', fillOpacity: .14 }).addTo(group);
    L.circleMarker([center.latitude, center.longitude], { radius: 6, color: 'white', weight: 3, fillColor: '#718ED4', fillOpacity: 1 }).bindTooltip('Search center').addTo(group);
    for (const cat of cats) {
      const element = document.createElement('div');
      element.className = `cat-pin ${cat.id === selectedId ? 'selected' : ''}`;
      const face = document.createElement('div'); face.className = 'cat-pin-face';
      if (cat.imageUrl) { const image = document.createElement('img'); image.src = cat.imageUrl; image.alt = cat.name; image.onerror = () => { image.style.display = 'none'; face.classList.add('no-photo'); }; face.appendChild(image); }
      else face.classList.add('no-photo');
      const dot = document.createElement('span'); dot.className = 'cat-pin-dot'; dot.style.backgroundColor = statuses[cat.status].color; face.appendChild(dot);
      const label = document.createElement('span'); label.className = 'cat-pin-label'; label.textContent = cat.name;
      element.append(face, label);
      L.marker([cat.location.latitude, cat.location.longitude], { icon: L.divIcon({ html: element, className: 'cat-map-marker', iconSize: [80, 83], iconAnchor: [40, 62] }), keyboard: true, title: `View ${cat.name}`, zIndexOffset: cat.id === selectedId ? 100 : 0 })
        .on('click', () => select.current(cat.id)).addTo(group);
    }
  }, [cats, center, selectedId]);
  return <div ref={container} aria-label="Map of neighborhood cats" style={{ width: '100%', height: '100%', background: '#E9EDE2', position: 'absolute', inset: 0 }} />;
}
