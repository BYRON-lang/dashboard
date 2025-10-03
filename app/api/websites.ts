import { collection, addDoc, getDocs, query, orderBy, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

export interface WebsiteData {
  id?: string;
  name: string;
  url: string;
  categories: string[];
  socialLinks: {
    twitter?: string;
    instagram?: string;
  };
  builtWith: string;
  otherTechnologies?: string;
  videoUrl?: string;
  uploadedAt: Timestamp;
}

export const uploadVideo = async (file: File): Promise<string> => {
  try {
    console.log('Starting video upload:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Generate a unique video ID
    const videoId = crypto.randomUUID();
    
    // Create a clean filename by replacing spaces and special characters
    const cleanFileName = file.name.replace(/[^\w\d.-]/g, '_');
    
    // Create the storage reference with the new format: videos/{videoId}_{filename}
    const storagePath = `videos/${videoId}_${cleanFileName}`;
    const videoRef = ref(storage, storagePath);

    console.log('Uploading to Firebase Storage path:', videoRef.fullPath);

    // Upload the file to Firebase Storage
    await uploadBytes(videoRef, file);
    
    // Instead of using the Firebase download URL, construct the CDN URL directly
    const cdnUrl = `https://cdn.gridrr.com/videos/${videoId}_${cleanFileName}`;
    
    console.log('Video uploaded successfully. CDN URL:', cdnUrl);
    return cdnUrl;
  } catch (error) {
    console.error('Error uploading video to Firebase Storage:', error);
    throw new Error('Failed to upload video');
  }
};

export const saveWebsite = async (websiteData: Omit<WebsiteData, 'id' | 'uploadedAt'>): Promise<string> => {
  try {
    console.log('Firebase config:', {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'Set' : 'Not set',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? 'Set' : 'Not set',
    });

    // Check if Firebase is properly configured
    if (!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_PROJECT_ID) {
      throw new Error('Firebase configuration is missing. Please check your .env file.');
    }

    const websiteWithMetadata = {
      ...websiteData,
      uploadedAt: Timestamp.now(),
    };

    console.log('Attempting to save website to Firestore:', websiteWithMetadata);

    // Save to Firestore database
    const docRef = await addDoc(collection(db, 'websites'), websiteWithMetadata);
    console.log('Website saved successfully to Firestore with ID:', docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('Error saving website to Firestore:', error);
    throw error;
  }
};

export const getWebsites = async (): Promise<WebsiteData[]> => {
  try {
    console.log('Fetching websites from Firestore...');

    const q = query(collection(db, 'websites'), orderBy('uploadedAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const websites = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as WebsiteData[];

    console.log('Retrieved websites from Firestore:', websites.length);
    return websites;
  } catch (error) {
    console.error('Error fetching websites from Firestore:', error);
    throw new Error('Failed to fetch websites');
  }
};

export const deleteWebsite = async (websiteId: string): Promise<void> => {
  try {
    console.log('Deleting website from Firestore:', websiteId);

    // Delete the document from Firestore
    const websiteRef = doc(db, 'websites', websiteId);
    await deleteDoc(websiteRef);

    console.log('Website deleted successfully from Firestore:', websiteId);
  } catch (error) {
    console.error('Error deleting website from Firestore:', error);
    throw new Error('Failed to delete website');
  }
};

export const getStorageUsage = async (): Promise<{ fileCount: number; totalSize: number; folders: { [key: string]: { count: number; size: number } } }> => {
  try {
    console.log('Calculating storage usage...');

    const folders = ['videos/', 'websites/'];
    let totalFileCount = 0;
    let totalSize = 0;
    const folderStats: { [key: string]: { count: number; size: number } } = {};

    for (const folder of folders) {
      try {
        const folderRef = ref(storage, folder);
        const result = await listAll(folderRef);

        let folderSize = 0;
        result.items.forEach((item) => {
          // Estimate file size (in production, you'd get actual metadata)
          // For now, using a reasonable average estimate
          const estimatedSize = 1024 * 1024; // 1MB average estimate
          folderSize += estimatedSize;
        });

        folderStats[folder] = {
          count: result.items.length,
          size: folderSize,
        };

        totalFileCount += result.items.length;
        totalSize += folderSize;

      } catch (error) {
        console.error(`Error listing files in ${folder}:`, error);
        folderStats[folder] = { count: 0, size: 0 };
      }
    }

    console.log('Storage usage calculated:', { totalFileCount, totalSize, folderStats });

    return {
      fileCount: totalFileCount,
      totalSize,
      folders: folderStats,
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    throw new Error('Failed to calculate storage usage');
  }
};
