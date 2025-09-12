'use client';

import React from 'react';
import DetailsItem from './DetailsItem';
//import User from '@/models/user';

const DetailsList = ({ users }) => {
  if (!users || !Array.isArray(users) || users.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-4 m-2 max-w-4xl mx-auto text-center">
        <p className="text-gray-600 text-lg">No users found.</p>
      </div>
    );
  }

  return (
    <div
      className="bg-gray-100 p-4 min-h-screen max-w-4xl mx-auto"
      role="list"
      aria-label="List of user details"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-4">User List</h2>
      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6">
        {users.map((user, index) => (
          <DetailsItem key={user._uid || index} user={user} />
        ))}
      </div>
    </div>
  );
};

export default DetailsList;