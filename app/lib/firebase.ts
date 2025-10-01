import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDVO-x7wATkpws9fgWrKNgqljqQzhpvYek",
    authDomain: "gridrr-storage.firebaseapp.com",
    projectId: "gridrr-storage",
    storageBucket: "gridrr-storage.firebasestorage.app",
    messagingSenderId: "478921294080",
    appId: "1:478921294080:web:e12aa4e9bfc8ba3aff73e5",
    measurementId: "G-3JND2GP4LW"
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
