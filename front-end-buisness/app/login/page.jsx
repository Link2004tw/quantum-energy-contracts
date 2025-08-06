/* Prompt: make this a dummy logic using dummyUsers from "@/models/dummyData" without modifying the User class */

"use client";

import Card from "../components/Layout/Card";
import SigningForm from "../components/Layout/SigningForm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../store";
import { useEffect } from "react";
import User from "../../models/user"; // Original: Unchanged User class import
import { dummyUsers } from "@/models/dummyData"; // Added: Import dummyUsers array

export default function LoginPage() {
  const authContext = useAuth();
  const router = useRouter();

  // Original: Check if user is logged in
  useEffect(() => {
    if (authContext.isLoggedIn) {
      router.push("/");
    }
  }, [authContext.isLoggedIn, router]);

  // Modified: Dummy login logic using dummyUsers array
  const submitHandler = async (user) => {
    try {
      // Modified: Find user in dummyUsers array by email
      const foundUser = dummyUsers.find((u) => u.email === user.email);

      if (!foundUser) {
        alert("User data not found.");
        return;
      }

      // Modified: Simulate token generation
      const token = `mock-token-${foundUser.uid}`;

      // Modified: Simulate API call to set session
      const loginResponse = { ok: true }; // Mock successful response

      if (!loginResponse.ok) {
        throw new Error("Failed to set session cookie");
      }

      // Original: Create User instance with unchanged User class
      const signer = new User({
        email: foundUser.email,
        username: foundUser.username,
        ethereumAddress: foundUser.ethereumAddress,
        uid: foundUser.uid,
        energy: foundUser.energy,
      });

      authContext.setSigner(signer);

      // Modified: Simulate role-based redirection (since dummyUsers doesn't have role field)
      // Assume users with email containing "alice" are admins for demo purposes
      if (foundUser.email.includes("alice")) {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Error signing in:", error);
      alert("Failed to sign in. Please try again.");
    }
  };

  // Original: UI structure remains unchanged
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
