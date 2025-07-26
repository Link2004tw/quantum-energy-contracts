Next.js API Documentation (solarfarm_ui)
Overview
The solarfarm_ui Next.js application (version 15.0.1) includes an API layer under app/api/ to handle server-side logic for authentication, session management, and role verification. These APIs support the EnergyContract energy trading platform by integrating with Firebase Authentication (solarfarm_ui/config/adminfirebase.js, solarfarm_ui/config/firebase.js) and the Ethereum blockchain. The endpoints enable critical frontend flows, such as user login (/login), energy purchasing (/buySolar), and admin actions (/admin/add-energy, /admin/update-price). This document details the /api/login and /api/verify-role endpoints, including their implementation, usage, and integration with the frontend.
Goals

Secure Authentication: Validate Firebase ID tokens and manage sessions to ensure authorized access.
Role-Based Access Control: Verify user roles (e.g., user, admin) to restrict admin-specific actions.
Seamless Integration: Support frontend flows with EnergyContract (via SolarFarmABI.json) and Firebase Realtime Database.
Maintainability: Use Next.js API routes for modular, serverless-compatible endpoints.
Security: Protect sensitive data (e.g., Firebase credentials, session cookies) and log errors for debugging.

API Structure
The API resides in the solarfarm_ui/app/api/ directory, leveraging Next.js App Router API routes. The implemented endpoints are:

/api/login (app/api/login/route.js): Authenticates users and sets a session cookie (__session) with a Firebase ID token.
/api/verify-role (app/api/verify-role/route.js): Verifies a user’s role using a Firebase ID token, ensuring access control for admin routes.

Directory Structure
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
│   │   │   └── progress.module.css
│   │   ├── update-price/
│   │   │   └── page.jsx
│   │   ├── page.jsx
│   │   ├── TransactionItem.jsx
│   │   ├── TransactionList.jsx
│   ├── buySolar/
│   │   └── page.jsx
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Card.jsx
│   │   │   ├── Model.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── SigningForm.jsx
│   │   ├── UI/
│   │   │   ├── NavLink.jsx
│   │   │   ├── PrimaryButton.jsx
│   │   │   ├── UnderlineButton.jsx
│   ├── login/
│   │   └── page.jsx
│   ├── orders/
│   │   ├── OrderItem.jsx
│   │   ├── OrdersList.jsx
│   │   └── page.jsx
│   ├── profile/
│   │   └── page.jsx
│   ├── signup/
│   │   └── page.jsx
│   ├── store/
│   │   └── index.jsx
│   ├── unauthorized/
│   │   └── page.jsx
│   ├── updateProfile/
│   │   └── page.jsx
│   ├── layout.jsx
│   ├── page.jsx
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
│   ├── tools.js
├── public/
│   ├── *.svg
│   ├── homeimage.jpeg
├── .env
├── firebase.json
├── tailwind.config.mjs
├── package.json

Endpoint: /api/login
The /api/login endpoint (app/api/login/route.js) authenticates users by accepting a Firebase ID token and setting a session cookie (__session). It is used by the /login page (app/login/page.jsx) to establish a user session after Firebase Authentication.
Source Code
import { NextResponse } from "next/server";

export async function POST(req) {
  const { idToken } = await req.json();
  if (!idToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const res = NextResponse.json({ status: "ok" });

  // Set the cookie — must be "__session"
  res.cookies.set("__session", idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
    sameSite: "strict",
  });

  return res;
}

Endpoint Details

Path: /api/login
Method: POST
Purpose: Validates a Firebase ID token and sets a session cookie (__session) for authenticated user sessions.
Dependencies:
Next.js (next/server): Uses NextResponse for response and cookie handling.
Firebase Authentication (config/firebase.js): Assumes the idToken is generated client-side (e.g., via signInWithEmailAndPassword).


Request:
Headers: None required.
Body:{ "idToken": "<firebase-id-token>" }


idToken: Firebase ID token obtained after client-side authentication.




Responses:
Success (200):{ "status": "ok" }


Sets a __session cookie containing the idToken.
Cookie attributes:
httpOnly: true: Prevents client-side JavaScript access.
secure: Enabled in production (process.env.NODE_ENV === "production").
path: "/": Available across all routes.
maxAge: 86400: Expires after 1 day (24 hours).
sameSite: "strict": Restricts cookie to same-site requests.




Error (400):{ "error": "Missing token" }


Returned if idToken is not provided in the request body.




Usage:
Called by /login (app/login/page.jsx) after Firebase client-side authentication (e.g., via SigningForm.jsx).
The __session cookie is used in subsequent requests (e.g., to /api/verify-role) for role verification.


Notes:
The endpoint does not verify the idToken server-side; it assumes client-side validation via Firebase SDK. For added security, consider verifying the token with adminAuth.verifyIdToken (as in /api/verify-role).
The status: "ok" response is minimal; consider returning additional user data (e.g., uid, email) if needed by the frontend.



Endpoint: /api/verify-role
The /api/verify-role endpoint (app/api/verify-role/route.js) verifies a user’s role by validating a Firebase ID token sent in the Authorization header. It ensures only authorized users (e.g., admins) access protected routes like /admin/add-energy and /admin/update-price.
Source Code
import { adminAuth as admin } from "@/config/adminfirebase";

export async function POST(req) {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) {
    return new Response(JSON.stringify({ error: "No token provided" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const decodedToken = await admin.verifyIdToken(token);
    return new Response(
      JSON.stringify({ role: decodedToken.role || "user" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Token verification error:", err);
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req) {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  console.log("fel verify");
  if (!token) {
    return new Response(JSON.stringify({ error: "No token provided" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const decodedToken = await admin.verifyIdToken(token);
    return new Response(
      JSON.stringify({ role: decodedToken.role || "user" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Token verification error:", err);
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}

Endpoint Details

Path: /api/verify-role
Methods: GET, POST
Purpose: Verifies a Firebase ID token and returns the user’s role (user or admin).
Dependencies:
Firebase Admin SDK (config/adminfirebase.js): Uses adminAuth.verifyIdToken to validate tokens.
Firebase Authentication: Assumes Email/Password or Google authentication is enabled.


Request:
Headers:
Authorization: Bearer token (Bearer <firebase-id-token>), typically the __session cookie value.


Body: None.


Responses:
Success (200):{ "role": "user" }

or{ "role": "admin" }


Returns the role claim from the decoded token, defaulting to "user".


Error (401):{ "error": "No token provided" }

or{ "error": "Invalid token" }


Returned for missing or invalid tokens.




Error Handling:
Logs errors to the console (e.g., Token verification error: <error>).
Returns a 401 status for invalid or missing tokens.


Usage:
Called by admin pages (e.g., /admin/add-energy, /admin/update-price) to verify admin privileges.
Uses the __session cookie set by /api/login as the token source.



Sequence Diagram
The following Mermaid sequence diagram illustrates the login and role verification flow, integrating /api/login and /api/verify-role. It is stored as docs/diagrams/login-flow.mmd.
sequenceDiagram
    actor U as User
    participant F as Next.js Frontend
    participant API as Next.js API
    participant DB as Firebase

    U->>F: Navigate to /login (app/login/page.jsx)
    F-->>U: Render Login page with SigningForm (components/Layout/SigningForm.jsx)
    U->>F: Submit credentials (email, password)
    F->>DB: Authenticate via Firebase SDK (config/firebase.js)
    DB-->>F: Return idToken
    F->>API: POST /api/login with { idToken } (app/api/login/route.js)
    API-->>F: Set __session cookie, return { status: "ok" }
    F-->>U: Redirect to /profile (app/profile/page.jsx)
    U->>F: Navigate to /admin/* (e.g., /admin/add-energy)
    F->>API: GET or POST /api/verify-role with Authorization: Bearer <__session> (app/api/verify-role/route.js)
    API->>DB: Verify token (config/adminfirebase.js)
    DB-->>API: Return decoded token with role
    API-->>F: Respond with { role: "admin" } or { error: "Invalid token" }
    F-->>U: Render admin page or redirect to /unauthorized (app/unauthorized/page.jsx)

    Note right of F: __session cookie used for subsequent role verification

Setup Instructions

Firebase Configuration:

Create a Firebase project at console.firebase.google.com.
Enable Email/Password and/or Google authentication in Build > Authentication.
Create a Realtime Database in Build > Realtime Database with test mode rules:{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}


Download the Firebase Admin SDK service account key and save as solarfarm_ui/solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json.
Configure solarfarm_ui/.env with Firebase credentials:NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-database-name.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email




Install Dependencies:
cd solarfarm_ui
npm install

Installs next@15.0.1, firebase@10.14.1, firebase-admin@12.5.0, and other dependencies per solarfarm_ui/package.json.

Run the Application:
npm run dev

Access at http://localhost:3000.

Secure Sensitive Files:

Ensure .gitignore includes:solarfarm_ui/.env
solarfarm_ui/*.json





Testing Instructions
Manual Testing

Test /api/login:

Setup:
Use /login (app/login/page.jsx) to authenticate with Firebase (e.g., via signInWithEmailAndPassword).
Capture the idToken from the Firebase response (inspect localStorage or network requests).


Test Cases:
Valid Token:
Send a POST request to http://localhost:3000/api/login:curl -X POST -H "Content-Type: application/json" -d '{"idToken": "<firebase-id-token>"}' http://localhost:3000/api/login


Expect: 200, { "status": "ok" }, and a __session cookie in the response headers.


Missing Token:
Send a POST request without idToken:curl -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/login


Expect: 400, { "error": "Missing token" }.




Verify Cookie:
Check browser developer tools for the __session cookie after login.
Confirm attributes: httpOnly, secure (in production), maxAge=86400, sameSite=strict.




Test /api/verify-role:

Setup:
Log in via /login to obtain a __session cookie.
Ensure an admin user exists (set via solarfarm_ui/setInitialAdmin.js or Firebase Console with role: "admin" claim).


Test Cases:
Valid Admin Token:
Send a POST or GET request to http://localhost:3000/api/verify-role:curl -H "Authorization: Bearer <firebase-id-token>" http://localhost:3000/api/verify-role


Expect: 200, { "role": "admin" }.


Valid User Token:
Use a non-admin user’s token.
Expect: 200, { "role": "user" }.


No Token:
Omit the Authorization header.
Expect: 401, { "error": "No token provided" }.


Invalid Token:
Use an invalid or expired token.
Expect: 401, { "error": "Invalid token" }.




Tools: Use Postman or curl.


Integration Testing:

Navigate to /login and authenticate; verify redirection to /profile (app/profile/page.jsx).
Access /admin/add-energy as an admin; confirm /api/verify-role returns { "role": "admin" } and the page loads.
Test unauthorized access (non-admin user); expect redirection to /unauthorized (app/unauthorized/page.jsx).
Use browser developer tools to inspect API calls and __session cookie.



Automated Testing

Note: The provided structure lacks automated API tests. Consider adding tests using Jest or Playwright:// solarfarm_ui/tests/api/login.test.js
const fetch = require('node-fetch');

describe('POST /api/login', () => {
  it('should set __session cookie for valid idToken', async () => {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: '<valid-id-token>' }),
    });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(response.headers.get('set-cookie')).toContain('__session');
  });

  it('should return error for missing idToken', async () => {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing token');
  });
});

// solarfarm_ui/tests/api/verify-role.test.js
describe('POST /api/verify-role', () => {
  it('should return admin role for valid admin token', async () => {
    const response = await fetch('http://localhost:3000/api/verify-role', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer <admin-token>' },
    });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.role).toBe('admin');
  });
});


Run tests with:cd solarfarm_ui
npm test



Integration with EnergyContract

/api/login:
Enables user authentication for accessing protected routes (e.g., /buySolar, /orders).
Sets the __session cookie used by /api/verify-role for subsequent role checks.
Supports the purchase energy flow (docs/diagrams/purchase-energy-flow.mmd) by ensuring authenticated users can interact with EnergyContract (utils/contract.js, SolarFarmABI.json).


/api/verify-role:
Secures admin actions (e.g., addEnergy, updatePrice) by verifying admin privileges before allowing EnergyContract interactions.
Used in docs/diagrams/add-energy-flow.mmd and docs/diagrams/update-price-flow.mmd to gate admin routes.



Security Considerations

Firebase Credentials:
Protect solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json and solarfarm_ui/.env in .gitignore.
Use environment variables for Firebase configuration (NEXT_PUBLIC_FIREBASE_*).


Token Validation:
/api/login: Consider adding server-side idToken verification with adminAuth.verifyIdToken to prevent invalid tokens from setting cookies.
/api/verify-role: Ensures robust token validation with Firebase Admin SDK.


Cookie Security:
__session cookie uses httpOnly, secure (in production), and sameSite: strict to prevent XSS and CSRF attacks.
Set maxAge appropriately (1 day); adjust for shorter sessions if needed.


Role Management:
Set custom claims (e.g., role: "admin") via solarfarm_ui/setInitialAdmin.js or Firebase Console.


Error Logging:
/api/verify-role logs errors to the console; consider a production logging service (e.g., Winston).


Rate Limiting:
Add rate limiting to both endpoints to prevent abuse (e.g., via Next.js middleware or Vercel).


CORS:
Restrict API routes to the frontend origin in production (configure in next.config.mjs).



Contributing Guidelines

Add New Endpoints:

Create new routes in app/api/ (e.g., app/api/<endpoint>/route.js).
Follow the patterns in /api/login and /api/verify-role: validate inputs, handle errors, return JSON responses.
Update docs/diagrams/ with new sequence diagrams.


Update Existing Endpoints:

Modify app/api/login/route.js or app/api/verify-role/route.js for new functionality (e.g., additional session data, role checks).
Update tests and diagrams (docs/diagrams/login-flow.mmd).


Test Changes:

Manually test with Postman or curl.
Add automated tests in solarfarm_ui/tests/.
Verify integration with frontend pages (/login, /admin/*) and EnergyContract.


Submit Changes:

Create a branch: git checkout -b feature/api-login-update.
Commit: git commit -m "Update /api/login documentation".
Push and open a PR against the main branch.
