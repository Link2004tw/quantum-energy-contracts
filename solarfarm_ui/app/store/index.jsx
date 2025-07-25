"use client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { createContext, useState, useContext, useEffect } from "react";
import { auth } from "../../config/firebase"; // Adjust the path as necessary
import { getSolarFarm } from "@/utils/contract";
import { getData } from "@/utils/databaseUtils";
import User from "@/models/user";

const initialValue = {
  user: null,
  setSigner: () => {},
  isLoggedIn: false,
  signOutHandler: () => {},
  isOwner: false,
  setIfOwner: async (address) => {},
};
const AuthContext = createContext(initialValue);

export default function AuthWrapper({ children }) {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const userData = await getData(`users/${uid}`);
        const token = await user.getIdToken();

        if (!userData) {
          console.log("No data found for user:", uid);
          alert("User data not found.");
          return;
        }
        console.log(userData);
        const signer = new User({
          email: userData.email,
          username: userData.username,
          birthday: new Date(userData.birthday),
          ethereumAddress: userData.ethereumAddress,
          uid: uid,
          token: token,
          energy: userData.energy,
          role: userData.role, // assuming you added a "role" field in DB
        });

        console.log("User is already signed in:", signer);
        setUser(signer);
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  const setSigner = (user) => {
    console.log("Setting user in context:", user);
    setUser(user);
    setIsLoggedIn(!!user); // Set isLoggedIn based on user presence
  };
  const signOutHandler = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsLoggedIn(false);
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const setIfOwner = async (address) => {
    return address === (await getSolarFarm());
  };

  const value = {
    user,
    setSigner,
    isLoggedIn,
    signOutHandler: signOutHandler,
    isOwner,
    setIfOwner,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
