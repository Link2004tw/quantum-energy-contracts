import React from 'react';

const MaintenancePage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Market Under Maintenance
        </h1>
        <p className="text-lg text-gray-600">
          Unpause the contract to access this page
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Thank you for your patience!
        </p>
      </div>
    </div>
  );
};

export default MaintenancePage;