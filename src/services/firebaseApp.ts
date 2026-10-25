import { getApp, getApps, initializeApp } from 'firebase/app';
import { firebaseConfig as config } from '../config/runtime';

// Expo replaces EXPO_PUBLIC values at build time; use static property accesses.
const missing = Object.entries(config).filter(([, value]) => !value?.trim()).map(([key]) => key);
if (missing.length) throw new Error(`Missing Firebase configuration: ${missing.join(', ')}. Fill in .env using .env.example.`);

export const app = getApps().some(existing => existing.name === '[DEFAULT]') ? getApp() : initializeApp(config);
