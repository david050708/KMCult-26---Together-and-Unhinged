export interface Student {
  id: string; // e.g. "kmc-001" to "kmc-150"
  index: number; // 1 to 150
  name: string;
  assigned: boolean;
}

export interface Photograph {
  id: string;
  url: string;
  caption: string;
  date?: string;
  location?: string;
  taggedStudentIds: string[]; // Classmate directory tags
  ociObjectKey?: string; // Oracle Cloud Object Storage object key
  artworkUrl?: string; // Persistent generated oil painting artwork URL in OCI
  artworkOciObjectKey?: string; // OCI object key for persistent generated artwork
  createdAt: string;
  updatedAt: string;
  rotation?: number; // natural tilt angle in degrees, e.g. -2 to +2
  size?: 'normal' | 'large' | 'compact' | 'wide';
  reconstructionMode?: 'original' | 'oil_painting' | 'legacy';
}

export interface Memory {
  id: string;
  title: string;
  description: string;
  date: string;
  category?: string;
  coverPhotoId?: string;
  coverPhotoUrl?: string;
  photos: Photograph[];
  reconstructionMode?: 'original' | 'oil_painting' | 'legacy';
  createdAt: string;
  updatedAt: string;
  isPasswordProtected?: boolean;
  isPendingDeletion?: boolean;
}

export interface AuthSession {
  token: string;
  authenticated: boolean;
}
