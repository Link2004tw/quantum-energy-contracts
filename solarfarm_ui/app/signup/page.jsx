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

export default function SignUpPage() {
  const router = useRouter();
  const authContext = useAuth();

  const submitHandler = async (user) => {
  try {
    if (user instanceof User) {
      // Sign up with Firebase Authentication
      const userCredentials = await createUserWithEmailAndPassword(
        auth,
        user._email,
        user._password
      );
      const uid = userCredentials.user.uid; // Get the UID

      // Save user data to Realtime Database using saveData
      await saveData(
        {
          email: user._email,
          username: user._username,
          birthday: user._birthday.toDateString(),
          ethereumAddress: user._ethereumAddress,
          createdAt: new Date().toISOString(),
          energy: user._energy
        },
        `users/${uid}`
      );

      authContext.setSigner(user);
      router.push("/");
    } else {
      throw new Error("Invalid user data");
    }
  } catch (error) {
    console.error("Error signing up or saving data:", error.message);
    alert(`Failed to sign up: ${error.message}`); // Show specific error
  }
};

  return (
    <div className="flex justify-center min-h-screen bg-gray-100 h-200 ">
      <Card title="Sign Up" maxHeight={"max-h-196"}>
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
