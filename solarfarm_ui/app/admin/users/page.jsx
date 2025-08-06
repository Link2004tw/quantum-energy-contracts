"use client";

import { auth } from "@/config/firebase";
import DetailsList from "./DetailsList"; //from '@/components/UI/DetailsList';
//import User from "@/models/user";
import { getData } from "@/utils/databaseUtils";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import User from "@/models/user";

export default function UsersPage() {
  //let users;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  let error = null;

  // try {
  //   users = await getData("/users");
  // }
  // catch(error){

  //  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const usersData = await getData("/users");
        const usersArray = Object.keys(usersData || {}).map((uid) => {
          const data = usersData[uid];
          return new User({
            email: data.email || "",
            username: data.username || "",
            ethereumAddress: data.ethereumAddress || null,
            uid,
            energy: data.energy || 0,
            token: data.token || null,
          });
        });
        
        if (!usersData) {
          alert("User data not found.");
          return;
        }
        const us = usersArray.filter((u) => u._username != "admin");
        setUsers(us);
      } else {
        setUsers(null);
      }
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  return (
    <div
      className="min-h-screen bg-gray-100 py-6"
      aria-label="Admin users page"
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Admin - Users
        </h1>
        {error ? (
          <div className="bg-white shadow-md rounded-lg p-4 m-2 text-center">
            <p className="text-red-600 text-lg">{error}</p>
          </div>
        ) : (
          <DetailsList users={users} />
        )}
      </div>
    </div>
  );
}
