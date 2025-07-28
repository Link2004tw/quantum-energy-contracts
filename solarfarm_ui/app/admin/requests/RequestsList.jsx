"use client";
import { useState, useEffect } from "react";
import RequestItem from "./RequestItem";
import { getData } from "@/utils/databaseUtils";

export default function RequestList({ contractConfig }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true);
      try {
        const data = await getData("requests");
        if (data) {
          // Convert Firebase object to array of requests
          const requestArray = Object.keys(data).map((key) => ({
            userId: key,
            ...data[key],
          }));
          setRequests(requestArray);
        } else {
          setRequests([]);
        }
      } catch (error) {
        console.error("Error fetching requests:", error);
        setError("Failed to load authorization requests. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Authorization Requests</h2>
      {isLoading && (
        <p className="text-center text-gray-600">Loading requests...</p>
      )}
      {error && (
        <p className="text-center text-red-500 mb-4">{error}</p>
      )}
      {!isLoading && requests.length === 0 && (
        <p className="text-center text-gray-600">No authorization requests found.</p>
      )}
      {!isLoading && requests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((request) => (
            <RequestItem
              key={request.userId}
              request={request}
              contractConfig={contractConfig}
            />
          ))}
        </div>
      )}
    </div>
  );
}