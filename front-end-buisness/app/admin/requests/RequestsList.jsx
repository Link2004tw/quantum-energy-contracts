"use client";

import { useState, useEffect } from "react";
import RequestItem from "./RequestItem";
import ToggleSwitch from "@/app/components/UI/ToggleSwitch";
import { dummyAuthorizationRequests } from "@/models/dummyData";

export default function RequestList({ isLoading: parentLoading }) {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true);
      try {
        // Use dummyRequests or mockDummyRequests if dummyRequests is not defined
        const data = dummyAuthorizationRequests;
        setRequests(data);
        // Apply initial filter based on showAll
        setFilteredRequests(
          showAll ? data : data.filter((req) => req.status === "pending")
        );
      } catch (error) {
        console.error("Error loading dummy requests:", error);
        setError("Failed to load authorization requests. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, []);

  useEffect(() => {
    // Update filtered requests when showAll or requests change
    setFilteredRequests(
      showAll ? requests : requests.filter((req) => req.status === "pending")
    );
  }, [showAll, requests]);

  const handleToggle = () => {
    setShowAll((prev) => !prev);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Authorization Requests
      </h2>
      <div className="items-center flex mb-4">
        <span className="mr-4">
          {showAll ? "Showing All Requests" : "Showing Pending Requests"}
        </span>
        <ToggleSwitch checked={showAll} onChange={handleToggle} />
      </div>
      {(isLoading || parentLoading) && (
        <p className="text-center text-gray-600">Loading requests...</p>
      )}
      {error && <p className="text-center text-red-500 mb-4">{error}</p>}
      {!(isLoading || parentLoading) && filteredRequests.length === 0 && (
        <p className="text-center text-gray-600">
          {showAll
            ? "No authorization requests found."
            : "No pending authorization requests found."}
        </p>
      )}
      {!(isLoading || parentLoading) && filteredRequests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((request) => (
            <RequestItem key={request.userId} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
