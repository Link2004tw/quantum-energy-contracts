import { initializeApp, cert, getApps} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { configDotenv } from "dotenv";

configDotenv();

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    databaseURL: "https://solarfarmsystem-default-rtdb.firebaseio.com",
  });
}

export const adminAuth = getAuth();
