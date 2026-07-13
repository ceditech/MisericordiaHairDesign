# Firebase Foundation Architecture (Milestone 8)

This document outlines the initial Firebase configuration for the Misericordia Hair Designs Next.js application.

## 1. Client-Side Initialization
- **Location**: `/src/lib/firebase/client.ts`
- **Pattern**: Singleton-style initialization safe for Next.js App Router (prevents multiple initializations during HMR).
- **Environment Variables**: Uses `NEXT_PUBLIC_FIREBASE_*` for non-secret client configuration.
- **Helpers**:
  - `getFirebaseApp()`: Access the raw Firebase App instance.
  - `getDb()`: Access Firestore.
  - `getAuthInstance()`: Access Firebase Auth (Milestone 9).
  - `getStorageInstance()`: Access Firebase Storage.
  - `getAnalyticsInstance()`: Optional, client-side only analytics.

## 2. Security Foundation
- **Firestore**: `firestore.rules` - Deny-by-default with minimal allowances for `bookingDrafts` (creation and lookup by ID).
- **Storage**: `storage.rules` - Deny-by-default with specific allowance for `/booking-uploads/` (restricted by size and type).

## 3. Local Development
- **Emulator Suite**: Configured for Auth, Firestore, and Storage.
- **Scripts**: 
  - `npm run firebase:emulators`: Start the local suite.
  - `npm run firebase:deploy:dev`: Deploy to the developer target.

## 4. Environment Management
- `.env.local`: Contains active configuration (not committed).
- `.env.example`: Template for new environments.
- `.firebaserc`: Maps the "default" alias to the `dedesbraids` project.

## 5. Next Steps
- **Milestone 9**: Implement Firebase Authentication and tighten security rules.
- **Milestone 10**: Implement full persistence for bookings and user profiles.
