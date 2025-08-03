"use client";

import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { auth } from "../../config/firebase";
import User from "../../models/user";
import React from "react";
import Card from "../components/Layout/Card";
import SigningForm from "../components/Layout/SigningForm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../store";
import { saveData } from "@/utils/databaseUtils";
import AuthorizationRequest from "@/models/request";

export default function SignUpPage() {
  const router = useRouter();
  const authContext = useAuth();

  // Function to check and register Ethereum address
  const checkAndRegisterAddress = async (ethAddress) => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("No authenticated user");
    }
    const response = await fetch("/api/check-registered", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address: ethAddress }),
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      throw new Error(data.error || "Failed to check Ethereum address");
    }
  };

  const submitHandler = async (user) => {
    try {
      if (user instanceof User) {
        // Sign up with Firebase Authentication
        const userCredentials = await createUserWithEmailAndPassword(
          auth,
          user._email,
          user._password
        );
        const uid = userCredentials.user.uid;

        // Check if Ethereum address exists
        const addressCheck = await checkAndRegisterAddress(
          user._ethereumAddress
        );
        console.log(addressCheck);
        // Save user data to Realtime Database
        const userData = {
          email: user._email,
          username: user._username,
          birthday: user._birthday.toDateString(),
          ethereumAddress: user._ethereumAddress,
          createdAt: new Date().toISOString(),
          energy: user._energy,
        };
        await saveData(userData, `users/${uid}`);

        // If address doesn't exist, create and save authorization request

        if (!addressCheck.exists) {
          const authRequest = new AuthorizationRequest(
            uid,
            user._ethereumAddress,
            {
              name: user._username,
              email: user._email,
              reason: "New user signup requesting access to EnergyContract",
              timestamp: new Date().toISOString(),
            }
          );

          await saveData(authRequest.toJSON(), `requests/${uid}`);
        } else {
          console.log(
            "Ethereum address already registered, skipping authorization request"
          );
        }

        authContext.setSigner(user);
        router.push("/");
      } else {
        throw new Error("Invalid user data");
      }
    } catch (error) {
      console.error("Error signing up or saving data:", error.message);
      alert(`Failed to sign up: ${error.message}`);
    }
  };

  return (
    <div className="flex justify-center min-h-screen bg-gray-100 h-200">
      <Card title="Sign Up" maxHeight="max-h-196">
        <SigningForm mode="signUp" onSubmit={submitHandler} />
        <p className="text-center mt-4 text-indigo-400">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-500 hover:underline">
            Sign In
          </Link>
        </p>
      </Card>
    </div>
  );
}
