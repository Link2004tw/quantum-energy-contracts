"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../store";
import { useRouter } from "next/navigation";
import SigningForm from "../components/Layout/SigningForm";
import Card from "../components/Layout/Card";
import Modal from "../components/Layout/Model";
import User from "@/models/user";
import { saveData } from "@/utils/databaseUtils";

export default function UpdateProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      setIsLoading(false);
    }
  }, [user, router]);

  const handleSubmit = async (updatedUser) => {
    if (!(updatedUser instanceof User)) {
      setErrorMessage("Invalid user data");
      setErrorModalOpen(true);
      return;
    }
    try {
      setIsLoading(true);
      await saveData(updatedUser.toFirebase(), `users/${updatedUser.uid}`);
    } catch (error) {
      console.error("Error saving user data:", error);
      setErrorMessage(error.message || "Failed to update profile");
      setErrorModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-4 text-primary-600">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto items-center">
      <Card title="Update profile" maxHeight="max-h-200">
        <SigningForm mode="update" onSubmit={handleSubmit} />
        {errorMessage && (
          <Modal
            isOpen={errorModalOpen}
            onClose={() => setErrorModalOpen(false)}
            onConfirm={() => setErrorModalOpen(false)}
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Error</h2>
            <p className="text-red-600">{errorMessage}</p>
          </Modal>
        )}
      </Card>
    </div>
  );
}
