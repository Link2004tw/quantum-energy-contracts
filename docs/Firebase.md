# Firebase System Documentation (solarfarm_ui)

## Overview

The Firebase system in the `solarfarm_ui` Next.js application (version 15.0.1) provides **authentication**, **role-based access control**, and **data persistence** for the `EnergyContract` energy trading platform. It leverages **Firebase Authentication** for user management, **Firebase Realtime Database** for storing user profiles, orders, and transactions, and the **Firebase Admin SDK** for server-side operations. The system integrates with the login system (`docs/LoginSystem.md`) and API routes (`app/api/login/route.js`, `app/api/verify-role/route.js`) to enable secure user interactions with `EnergyContract` (`utils/contract.js`, `SolarFarmABI.json`). This document details the Firebase components, configuration, usage, security, and integration, including a Mermaid diagram to visualize key flows.

### Goals

- **Secure Authentication**: Validate user identities using Firebase Authentication (Email/Password, Google).
- **Role-Based Access**: Enforce access control for admin routes (e.g., `/admin/add-energy`, `/admin/update-price`) using custom claims.
- **Data Persistence**: Store user profiles, committed orders, and transaction logs in Realtime Database.
- **Scalability**: Use Firebase’s serverless infrastructure for maintainable, high-performance operations.
- **Integration**: Support frontend flows (`/login`, `/buySolar`) and `EnergyContract` interactions.

## Components

### Firebase Authentication

- **Purpose**: Manages user login, signup, and session validation.
- **Implementation**: Configured in `config/firebase.js` using Firebase client SDK.
- **Features**:
    - Supports Email/Password and Google authentication.
    - Generates `idToken` for authenticated users, used in `/api/login` (`app/api/login/route.js`).
    - Custom claims (e.g., `role: admin`) for role-based access.
- **Usage**: Integrated into `/login` (`app/login/page.jsx`) and `/signup` (`app/signup/page.jsx`) via `SigningForm.jsx` (`components/Layout/SigningForm.jsx`).

### Firebase Admin SDK

- **Purpose**: Performs server-side operations, such as token verification.
- **Implementation**: Initialized in `config/adminfirebase.js` with a service account key (`solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json`).
- **Features**:
    - Verifies `idToken` using `adminAuth.verifyIdToken` in `/api/verify-role` (`app/api/verify-role/route.js`).
    - Extracts custom claims (e.g., `role`) for access control.
- **Usage**: Ensures only admins access protected routes (`/admin/*`).

### Firebase Realtime Database

- **Purpose**: Stores application data for users, orders, and transactions.
- **Implementation**: Configured in `config/firebase.js` with a database URL, accessed via client and Admin SDKs.
- **Data Models**:
    - `models/user.js`: Stores user profiles (e.g., UID, email, address, name).
    - `models/commitedOrders.js`: Tracks energy purchase commitments (`commitPurchase` details).
    - `models/transaction.js`: Logs admin actions (e.g., energy additions, price updates).
- **Usage**:
    - **Users**: Updated via `/signup` and `/updateProfile` (`app/updateProfile/page.jsx`).
    - **Orders**: Written during energy purchases (`/buySolar`, `app/buySolar/page.jsx`).
    - **Transactions**: Logged from admin actions (`/admin/add-energy`, `/admin/update-price`).
- **Security**: Protected by Firebase Security Rules requiring authenticated access.

### Configuration Files

- `config/firebase.js`: Initializes Firebase client SDK for authentication and database access.
- `config/adminfirebase.js`: Initializes Firebase Admin SDK for server-side operations.
- `.env`: Stores Firebase credentials (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`, `FIREBASE_PRIVATE_KEY`).
- `solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json`: Service account key for Admin SDK.

### Project Structure

```
solarfarm_ui/
├── app/
│   ├── api/
│   │   ├── login/
│   │   │   └── route.js
│   │   ├── verify-role/
│   │   │   └── route.js
│   ├── admin/
│   │   ├── add-energy/
│   │   │   ├── page.jsx
│   │   │   ├── ProgressBar.jsx
│   │   ├── update-price/
│   │   │   └── page.jsx
│   │   ├── page.jsx
│   ├── buySolar/
│   │   └── page.jsx
│   ├── login/
│   │   └── page.jsx
│   ├── signup/
│   │   └── page.jsx
│   ├── updateProfile/
│   │   └── page.jsx
│   ├── profile/
│   │   └── page.jsx
│   ├── orders/
│   │   ├── OrderItem.jsx
│   │   ├── OrdersList.jsx
│   │   └── page.jsx
│   ├── unauthorized/
│   │   └── page.jsx
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── SigningForm.jsx
│   │   ├── UI/
│   │   │   ├── PrimaryButton.jsx
├── config/
│   ├── adminfirebase.js
│   ├── firebase.js
│   ├── MockPriceABI.json
│   ├── SolarFarmABI.json
├── models/
│   ├── commitedOrders.js
│   ├── transaction.js
│   ├── user.js
├── utils/
│   ├── contract.js
│   ├── databaseUtils.js
├── .env
├── firebase.json
├── tailwind.config.mjs
├── package.json
```

## Firebase Flow

1. **Authentication**:
    
    - Users authenticate via `/login` or `/signup` using Firebase client SDK (`config/firebase.js`).
    - Firebase returns an `idToken`, sent to `/api/login` to set the `__session` cookie.
2. **Session Management**:
    
    - `/api/login` (`app/api/login/route.js`) sets the `__session` cookie with secure attributes.
    - The cookie is used in subsequent requests (e.g., `/api/verify-role`).
3. **Role Verification**:
    
    - Admin routes (`/admin/*`) trigger `/api/verify-role`, which verifies the `__session` `idToken` using Admin SDK (`config/adminfirebase.js`).
    - Returns `role: admin` or `role: user`, controlling access.
4. **Data Storage**:
    
    - **User Profiles**: Saved during signup (`/signup`) or updates (`/updateProfile`) to `users` collection (`models/user.js`).
    - **Committed Orders**: Stored during energy purchases (`/buySolar`) in `commitedOrders` (`models/commitedOrders.js`).
    - **Transactions**: Logged for admin actions (`/admin/add-energy`, `/admin/update-price`) in `transactions` (`models/transaction.js`).

### Sequence Diagram

The following Mermaid diagram visualizes Firebase interactions, stored as `docs/diagrams/firebase-flow.mmd`.

```mermaid
sequenceDiagram
    actor U as User
    participant F as Next.js Frontend
    participant API as Next.js API
    participant DB as Firebase

    U->>F: Navigate to /login or /signup (app/login/page.jsx, app/signup/page.jsx)
    F-->>U: Render SigningForm (components/Layout/SigningForm.jsx)
    U->>F: Submit credentials (email, password)
    F->>DB: Authenticate via Firebase SDK (config/firebase.js)
    DB-->>F: Return idToken
    F->>API: POST /api/login with { idToken } (app/api/login/route.js)
    API-->>F: Set __session cookie, return { status: "ok" }
    F-->>U: Redirect to /profile (app/profile/page.jsx)

    opt Data Storage
        U->>F: Perform action (e.g., buy energy, update profile)
        F->>DB: Write to Realtime Database (e.g., users, commitedOrders, transactions) (config/firebase.js)
        DB-->>F: Confirm write
    end

    opt Admin Access
        U->>F: Navigate to /admin/* (e.g., /admin/add-energy)
        F->>API: POST /api/verify-role with Authorization: Bearer <__session> (app/api/verify-role/route.js)
        API->>DB: Verify idToken via Admin SDK (config/adminfirebase.js)
        DB-->>API: Return decoded token with role
        API-->>F: Respond with { role: "admin" } or { error: "Invalid token" }
        F-->>U: Render admin page or redirect to /unauthorized (app/unauthorized/page.jsx)
        F->>DB: Log transaction (e.g., transactions) (config/firebase.js)
        DB-->>End: Confirm write
    end

    Note right of DB: Stores users, commitedOrders, transactions; secures via auth rules
```

## Setup Instructions

1. **Create Firebase Project**:
    
    - Go to [console.firebase.google.com](https://console.firebase.google.com/) and create a project.
    - Enable **Email/Password** and **Google** authentication in **Build > Authentication**.
    - Create a **Realtime Database** in **Build > Realtime Database** with test mode rules:
        
        ```json
        {
          "rules": {
            ".read": "auth != null",
            ".write": "auth != null"
          }
        }
        ```
        
2. **Configure Credentials**:
    
    - Download the Firebase Admin SDK service account key and save as `solarfarm_ui/solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json`.
    - Create `solarfarm_ui/.env`:
        
        ```plaintext
        NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain.firebaseapp.com
        NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-database-name.firebaseio.com
        NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=https://your-storage-bucket.appspot.com
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
        NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
        FIREBASE_PROJECT_ID=your-project-id
        FIREBASE_PRIVATE_KEY=your-private-key
        FIREBASE_CLIENT_EMAIL=your-client-email
        ```
        
    - Update `.gitignore`:
        
        ```plaintext
        solarfarm_ui/.env
        solarfarm_ui/*.json
        ```
        
3. **Install Dependencies**:
    
    ```bash
    cd solarfarm_ui
    npm install
    ```
    
    Installs `firebase@10.14.1`, `firebase-admin@12.5.0`, and others per `package.json`.
    
4. **Initialize Firebase**:
    
    - Ensure `config/firebase.js` initializes the client SDK:
        
        ```javascript
        import firebase from 'firebase/app';
        import 'firebase/auth';
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        export const auth = firebase.auth();
        export const database = firebase.database();
        ```
        
    - Ensure `config/adminfirebase.js` initializes the Admin SDK:
        
        ```javascript
        import * as admin from 'firebase-admin';
        import serviceAccount from './solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json';
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
          });
        }
        export const adminAuth = admin.auth();
        export const adminDB = admin.database();
        ```
        
5. **Run the Application**:
    
    ```bash
    npm run dev
    ```
    
    Access at `http://localhost:3000`.
    

## Testing Instructions

### Manual Testing

1. **Authentication**:
    
    - Navigate to `/login` (`http://localhost:3000/login`) and sign in with valid credentials.
    - Verify redirection to `/profile` and `__session` cookie in browser dev tools.
    - Test `/signup` to create a new user; check Firebase Console for user entry.
    - Test invalid credentials; expect error in `SigningForm.jsx`.
2. **Role Verification**:
    
    - Set an admin user via `setInitialAdmin.js` or Firebase Console:
        
        ```javascript
        // solarfarm_ui/setInitialAdmin.js
        import { adminAuth } from './config/adminfirebase';
        adminAuth.setCustomUserClaims('user-uid', { role: 'admin' });
        ```
        
    - Log in as admin and access `/admin/add-energy`; verify page loads.
    - Log in as non-admin; expect redirection to `/unauthorized`.
3. **Database**:
    
    - Sign up or update profile (`/updateProfile`); check Firebase Console for `users` data.
    - Purchase energy (`/buySolar`); verify `commitedOrders` in database.
    - Perform admin action (e.g., add energy); confirm `transactions` entry.
4. **API Integration**:
    
    - Test `/api/login`:
        
        ```bash
        curl -X POST -H "Content-Type: application/json" -d '{"idToken": "<firebase-id-token>"}' http://localhost:3000/api/login
        ```
        
    - Test `/api/verify-role`:
        
        ```bash
        curl -H "Authorization: Bearer <idToken>" http://localhost:3000/api/verify-role
        ```
        

### Automated Testing

- Add Jest/Playwright tests in `solarfarm_ui/tests/`:
    
    ```javascript
    // solarfarm_ui/tests/firebase.test.js
    const firebase = require('firebase/app');
    require('firebase/auth');
    
    describe('Firebase Authentication', () => {
      it('authenticates valid user', async () => {
        const userCredential = await firebase.auth().signInWithEmailAndPassword('test@example.com', 'password');
        expect(userCredential.user).toBeDefined();
        expect(userCredential.user.getIdToken).toBeDefined();
      });
    });
    ```
    
- Run tests:
    
    ```bash
    npm test
    ```
    

## Integration with EnergyContract

- **Authentication**: Enables users to access `/buySolar` and interact with `EnergyContract` (`commitPurchase`, `revealPurchase`).
- **Data Storage**: Stores `commitedOrders` and `transactions` to track blockchain interactions.
- **Admin Actions**: Verifies admin role for `addEnergy` and `updatePrice` calls, logging to `transactions`.
- **Diagrams**: Visualized in `docs/diagrams/firebase-flow.mmd`, `login-flow.mmd`, `purchase-energy-flow.mmd`, `add-energy-flow.mmd`, `update-price-flow.mmd`.

## Security Considerations

- **Credentials**:
    - Protect `solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json` and `.env` in `.gitignore`.
    - Use environment variables for Firebase config.
- **Security Rules**:
    - Update Realtime Database rules for production:
        
        ```json
        {
          "rules": {
            "users": {
              "$uid": {
                ".read": "auth != null && auth.uid == $uid",
                ".write": "auth != null && auth.uid == $uid"
              }
            },
            "commitedOrders": {
              "$uid": {
                ".read": "auth != null && auth.uid == $uid",
                ".write": "auth != null && auth.uid == $uid"
              }
            },
            "transactions": {
              ".read": "auth != null && auth.token.role == 'admin'",
              ".write": "auth != null && auth.token.role == 'admin'"
            }
          }
        }
        ```
        
- **Token Verification**:
    - Add server-side `idToken` verification in `/api/login` using `adminAuth.verifyIdToken`.
- **Rate Limiting**:
    - Apply to `/api/login` and `/api/verify-role` to prevent abuse.
- **Data Validation**:
    - Sanitize database writes in `databaseUtils.js` to prevent malformed data.
- **Logging**:
    - Replace console logs in `/api/verify-role` with a logging service.

## Contributing Guidelines

1. **Enhancements**:
    - Add server-side verification to `/api/login`.
    - Implement additional authentication providers (e.g., Twitter).
    - Optimize database structure for performance.
2. **Testing**:
    - Add tests for database operations and authentication.
    - Update `docs/diagrams/firebase-flow.mmd` for changes.
3. **PR Process**:
    - Branch: `git checkout -b feature/firebase-update`.
    - Commit: `git commit -m "Update Firebase system"`.
    - Open PR against `main`.

## Notes

- **AI Assistance**:
    - Firebase config and models designed with AI tools (e.g., Grok), validated manually.
- **Diagrams**:
    - Store `firebase-flow.mmd` in `docs/diagrams/` and reference in `docs/ARCHITECTURE.md`.