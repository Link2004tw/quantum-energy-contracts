"use client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { createContext, useState, useContext, useEffect } from "react";
import { auth } from "../../config/firebase"; // Adjust the path as necessary
import { getData } from "@/utils/databaseUtils";
import User from "@/models/user";

const initialValue = {
    user: null,
    setSigner: () => {},
    isLoggedIn: false,
    signOutHandler: () => {},
    signUp: () => {},
};
const AuthContext = createContext(initialValue);

export default function AuthWrapper({ children }) {
    const [user, setUser] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const uid = user.uid;
                const token = await user.getIdToken();
                const response = await fetch(`/api/get-user?uid=${uid}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!response.ok) {
                    console.error("Failed to fetch user data:", response.statusText);
                    return;
                }
                const data = await response.json();
                if (data.error || !data.success || !data.user) {
                    console.error("Error fetching user data:", data.error);
                    return;
                }
                const signer = new User({ ...data.user, uid: uid });

                setUser(signer);
                setIsLoggedIn(true);
            } else {
                setUser(null);
                setIsLoggedIn(false);
            }
        });

        return () => unsubscribe(); // Cleanup on unmount
    }, []);

    const signUp = async () => {
        const uid = auth.currentUser.uid;
        const userData = await getData(`users/${uid}`);

        if (!userData) {
            alert("User data not found.");
            return;
        }
        const signer = new User({
            email: userData.email,
            username: userData.username,
            ethereumAddress: userData.ethereumAddress,
            uid: uid,
            energy: userData.energy,
        });

        setUser(signer);
        setIsLoggedIn(true);
    };

    const setSigner = (user) => {
        console.log(user);
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

    const value = {
        user,
        setSigner,
        isLoggedIn,
        signOutHandler: signOutHandler,
        signUp,
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
