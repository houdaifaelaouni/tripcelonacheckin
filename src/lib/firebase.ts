import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  collection, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { TravelTrip, Ticket, UserProfile, UserRole, SystemSettings } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Must pass database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection to Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline, verifying cloud link...');
    }
    return false;
  }
}

// Subscribe to User Profile in Firestore
export function subscribeToUserProfile(
  userId: string, 
  callback: (profile: UserProfile | null) => void
) {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error('Error fetching user profile:', err);
      callback(null);
    }
  );
}

// Create or update user profile with chosen role
export async function saveUserProfile(
  user: FirebaseUser, 
  role: UserRole
): Promise<UserProfile> {
  const isPrimaryAdmin = user.email?.toLowerCase() === 'houdayfaelaouni2006@gmail.com';
  const assignedRole: UserRole = isPrimaryAdmin ? 'admin' : role;

  const profile: UserProfile = {
    uid: user.uid,
    email: user.email || 'user@tripcelona.com',
    displayName: user.displayName || user.email?.split('@')[0] || 'Team Member',
    photoURL: user.photoURL || undefined,
    role: assignedRole,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
    return profile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Admin function: Update any team member's role
export async function updateUserRoleByAdmin(
  targetUid: string, 
  newRole: UserRole
): Promise<void> {
  const path = `users/${targetUid}`;
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      role: newRole,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Listen to all team members (Admins only)
export function subscribeToAllUsers(callback: (users: UserProfile[]) => void) {
  const usersRef = collection(db, 'users');
  return onSnapshot(
    usersRef,
    (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as UserProfile);
      });
      callback(list);
    },
    (err) => {
      console.error('Error fetching users:', err);
    }
  );
}

// Listen to all Travels in real-time
export function subscribeToTrips(callback: (trips: TravelTrip[]) => void) {
  const tripsRef = collection(db, 'trips');
  return onSnapshot(
    tripsRef,
    (snapshot) => {
      const tripsList: TravelTrip[] = [];
      snapshot.forEach((docSnap) => {
        tripsList.push(docSnap.data() as TravelTrip);
      });
      // Sort by date descending
      tripsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(tripsList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'trips');
    }
  );
}

// Listen to all Tickets in real-time
export function subscribeToTickets(callback: (tickets: Ticket[]) => void) {
  const ticketsRef = collection(db, 'tickets');
  return onSnapshot(
    ticketsRef,
    (snapshot) => {
      const ticketsList: Ticket[] = [];
      snapshot.forEach((docSnap) => {
        ticketsList.push(docSnap.data() as Ticket);
      });
      callback(ticketsList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'tickets');
    }
  );
}

// Cloud Mutation: Create Travel (customizable capacity)
export async function createCloudTrip(trip: Omit<TravelTrip, 'id' | 'createdAt'>): Promise<TravelTrip> {
  const tripId = `TRIP-${Date.now().toString(36).toUpperCase()}`;
  const newTrip: TravelTrip = {
    ...trip,
    id: tripId,
    capacity: trip.capacity > 0 ? Number(trip.capacity) : 55,
    status: trip.status || 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const path = `trips/${tripId}`;
  try {
    await setDoc(doc(db, 'trips', tripId), newTrip);
    return newTrip;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Cloud Mutation: Update Travel (e.g. customize places/capacity or route)
export async function updateCloudTrip(tripId: string, updates: Partial<TravelTrip>): Promise<void> {
  const path = `trips/${tripId}`;
  try {
    await updateDoc(doc(db, 'trips', tripId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Cloud Mutation: Delete Travel
export async function deleteCloudTrip(tripId: string): Promise<void> {
  const path = `trips/${tripId}`;
  try {
    await deleteDoc(doc(db, 'trips', tripId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Cloud Mutation: Create Ticket (Check-in generation)
export async function createCloudTicket(params: {
  tripId: string;
  firstName: string;
  lastName: string;
  destination: string;
  seatNumber: number;
  createdByName?: string;
  status?: 'pending' | 'checked_in' | 'cancelled' | 'valid';
  paymentStatus?: 'paid' | 'pending' | 'unpaid';
  amountPaid?: number;
  paymentIntentId?: string;
  paymentMethod?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  emailDeliveryStatus?: 'sent' | 'pending' | 'failed';
  whatsappDeliveryStatus?: 'sent' | 'ready';
  stripeAccountUsed?: 'account_1' | 'account_2';
  stripeAccountLabel?: string;
}): Promise<Ticket> {
  const cleanFirst = params.firstName.trim();
  const cleanLast = params.lastName.trim();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const ticketId = `TC-${params.seatNumber.toString().padStart(2, '0')}-${randomSuffix}`;

  const payloadObject = {
    app: 'Tripcelona',
    ticketId,
    tripId: params.tripId,
    passenger: `${cleanFirst} ${cleanLast}`,
    seat: params.seatNumber,
    dest: params.destination,
    v: 2,
  };

  const newTicket: Ticket = {
    id: ticketId,
    tripId: params.tripId,
    firstName: cleanFirst,
    lastName: cleanLast,
    destination: params.destination,
    seatNumber: params.seatNumber,
    status: params.status || 'valid',
    paymentStatus: params.paymentStatus || 'unpaid',
    amountPaid: params.amountPaid,
    paymentIntentId: params.paymentIntentId,
    paymentMethod: params.paymentMethod,
    contactEmail: params.contactEmail,
    contactPhone: params.contactPhone,
    whatsappNumber: params.whatsappNumber,
    emailDeliveryStatus: params.emailDeliveryStatus || 'sent',
    whatsappDeliveryStatus: params.whatsappDeliveryStatus || 'ready',
    stripeAccountUsed: params.stripeAccountUsed || (params.seatNumber <= 28 ? 'account_1' : 'account_2'),
    stripeAccountLabel: params.stripeAccountLabel || (params.seatNumber <= 28 ? 'Stripe Account 1 (Seats 1–28)' : 'Stripe Account 2 (Seats 29–55)'),
    qrPayload: JSON.stringify(payloadObject),
    checkedInAt: null,
    createdByName: params.createdByName || 'Online Passenger Checkout',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const path = `tickets/${ticketId}`;
  try {
    await setDoc(doc(db, 'tickets', ticketId), newTicket);
    return newTicket;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Cloud Mutation: Toggle Check-in Status (Driver or Admin)
export async function toggleCloudCheckInStatus(
  ticketId: string, 
  currentStatus: 'pending' | 'checked_in' | 'cancelled' | 'valid',
  conductorName: string = 'Driver'
): Promise<Ticket['status']> {
  const newStatus = currentStatus === 'checked_in' ? 'pending' : 'checked_in';
  const checkedInAt = newStatus === 'checked_in' ? new Date().toISOString() : null;
  const path = `tickets/${ticketId}`;

  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      status: newStatus,
      checkedInAt,
      checkedInBy: newStatus === 'checked_in' ? conductorName : null,
      updatedAt: new Date().toISOString(),
    });
    return newStatus;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Cloud Mutation: Delete Ticket (Frees up seat)
export async function deleteCloudTicket(ticketId: string): Promise<void> {
  const path = `tickets/${ticketId}`;
  try {
    await deleteDoc(doc(db, 'tickets', ticketId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// System Settings: Stripe Dual Accounts configuration
export function subscribeToStripeSettings(callback: (settings: SystemSettings | null) => void) {
  const settingsDocRef = doc(db, 'settings', 'stripe_config');
  return onSnapshot(
    settingsDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as SystemSettings);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Stripe settings subscription warning:', err);
      callback(null);
    }
  );
}

export async function saveCloudStripeSettings(settings: SystemSettings): Promise<void> {
  const path = 'settings/stripe_config';
  try {
    await setDoc(doc(db, 'settings', 'stripe_config'), {
      ...settings,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

