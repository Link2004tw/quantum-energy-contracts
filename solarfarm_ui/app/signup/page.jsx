"use client";

import { createUserWithEmailAndPassword } from "firebase/auth";
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
      //if (user instanceof User) {
      // Sign up with Firebase Authentication
      const userCredentials = await createUserWithEmailAndPassword(
        auth,
        user.email,
        user.password
      );
      const uid = userCredentials.user.uid;

      // Check if Ethereum address exists
      const addressCheck = await checkAndRegisterAddress(user.ethereumAddress);

      const userData = new User({
        email: user.email,
        username: user.username,
        birthday: new Date(user.birthday).toDateString(),
        ethereumAddress: user.ethereumAddress,
        createdAt: new Date().toISOString(),
        energy: user.energy,
        uid: uid
      });
      await saveData(userData.toJSON(), `users/${uid}`);

      // If address doesn't exist, create and save authorization request

      if (!addressCheck.exists) {
        console.log("hi");
        const authRequest = new AuthorizationRequest(
          uid,
          userData._ethereumAddress,
          {
            name: userData._username,
            email: userData._email,
            reason: "New user signup requesting access to EnergyContract",
            timestamp: new Date().toISOString(),
          }
        );

        await saveData(authRequest.toJSON(), `requests/${uid}`);
        //await authContext.signIn();
      } else {
        console.log(
          "Ethereum address already registered, skipping authorization request"
        );
      }

      authContext.setSigner(userData);
      router.push("/");
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
