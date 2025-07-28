"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../store";
import RequestList from "./RequestsList"; //from "../components/RequestList";
import Link from "next/link";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/utils/constants";

export default function RequestsPage() {
  const { signer } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!signer) {
      router.push("/login");
    }
  }, [signer, router]);

  if (!signer) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Admin Requests</h1>
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6">
        <RequestList
          contractConfig={{
            contractAddress: CONTRACT_ADDRESS,
            contractAbi: CONTRACT_ABI,
          }}
        />
      </main>
    </div>
  );
}
