"use client";

import { useEffect, useState } from "react";
import DetailsList from "./DetailsList";
import { dummyUsers } from "@/models/dummyData";
import { useAuth } from "@/app/store";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const user = useAuth().user;
  useEffect(() => {
    // Filter out admin user from dummyUsers
    const filteredUsers = dummyUsers.filter((u) => u.uid !== user.uid);
    setUsers(filteredUsers);
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
        <DetailsList users={users} />
      </div>
    </div>
  );
}
