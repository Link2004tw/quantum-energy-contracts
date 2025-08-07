"use client";

import Card from "../components/Layout/Card";
import SigningForm from "../components/Layout/SigningForm";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase";
import User from "../../models/user";
import { useRouter } from "next/navigation";
import { useAuth } from "../store";
import { getData } from "@/utils/databaseUtils";
import { useEffect } from "react";

export default function LoginPage() {
    const authContext = useAuth();
    const router = useRouter();
    useEffect(() => {
        if (authContext.isLoggedIn) {
            router.push("/");
        }
    });

    const submitHandler = async (user) => {
        try {
            const userCredentials = await signInWithEmailAndPassword(auth, user.email, user.password);

            const firebaseUser = userCredentials.user;
            const uid = firebaseUser.uid;
            const token = await firebaseUser.getIdToken();

            const loginResponse = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ idToken: token }),
            });

            if (!loginResponse.ok) {
                throw new Error("Failed to set session cookie");
            }

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
                role: userData.role, // assuming you added a "role" field in DB
            });
            console.log(signer);
            authContext.setSigner(signer);

            // 🔁 Redirect based on role
            if (userData.role === "admin") {
                router.push("/admin/dashboard"); // or wherever the admin panel is
            } else {
                router.push("/"); // regular user home page
            }
        } catch (error) {
            console.error("Error signing in:", error);
            alert("Failed to sign in. Please try again.");
        }
    };

    return (
        <div className="flex justify-center min-h-screen bg-gray-100">
            <Card title="Log In" maxHeight="max-h-117">
                <SigningForm mode="signIn" onSubmit={submitHandler} />
                <p className="text-center mt-4 text-indigo-400">
                    No account yet?{" "}
                    <Link href="/signup" className="text-blue-500 hover:underline">
                        Create an account
                    </Link>
                </p>
                {/* <p className="text-center mt-4 text-blue-700">
          Are you the owner?{" "}
          <Link className="text-blue-500 hover:underline" href="/solarSignIn">
            Sign In Here
          </Link>
        </p> */}
            </Card>
        </div>
    );
}
