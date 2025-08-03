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
};
const AuthContext = createContext(initialValue);

export default function AuthWrapper({ children }) {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const userData = await getData(`users/${uid}`);

        if (!userData) {
          //alert("User data not found.");
          return;
        }
        const signer = new User({
          email: userData.email,
          username: userData.username,
          birthday: new Date(userData.birthday),
          ethereumAddress: userData.ethereumAddress,
          uid: uid,
          energy: userData.energy,
        });

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
    setUser(user);
    setIsLoggedIn(!!user); // Set isLoggedIn based on user presence
  };
  const signOutHandler = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsLoggedIn(false);
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
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
