'use client';

import { useState } from 'react';
import AuthorizationRequest from '@/models/request';
import { saveData } from '@/utils/databaseUtils';
import { authorizeParty } from '@/utils/contract';

export default function RequestItem({ request }) {
  const [status, setStatus] = useState(request.status || 'pending');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuthorize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create AuthorizationRequest instance
      const authRequest = new AuthorizationRequest(
        request.userId,
        request.ethereumAddress,
        request.metadata
      );

      // Submit authorization to contract
      await authorizeParty(request.ethereumAddress);

      // Update status in Firebase
      authRequest.updateStatus('approved');
      await saveData(authRequest.toJSON(), `requests/${request.userId}`);
      setStatus('approved');
      alert('User authorized successfully!');
    } catch (error) {
      console.error('Authorization failed:', error);
      let errorMessage = error.reason || error.message || 'Failed to authorize user.';
      if (error.reason === 'Signer is not the contract owner.') {
        errorMessage = 'Only the contract owner can authorize users.';
      }
      setError(errorMessage);
      setStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create AuthorizationRequest instance
      const authRequest = new AuthorizationRequest(
        request.userId,
        request.ethereumAddress,
        request.metadata
      );

      // Update status in Firebase
      authRequest.updateStatus('rejected');
      await saveData(authRequest.toJSON(), `requests/${request.userId}`);
      setStatus('rejected');
      alert('Request rejected successfully!');
    } catch (error) {
      console.error('Rejection failed:', error);
      setError(error.message || 'Failed to reject request.');
      setStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 m-4 max-w-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Authorization Request</h3>
      <div className="text-sm text-gray-600 space-y-1">
        <p><strong>User ID:</strong> {request.userId}</p>
        <p><strong>Ethereum Address:</strong> {request.ethereumAddress}</p>
        <p><strong>Name:</strong> {request.metadata.name}</p>
        <p><strong>Email:</strong> {request.metadata.email}</p>
        <p><strong>Reason:</strong> {request.metadata.reason}</p>
        <p><strong>Timestamp:</strong> {new Date(request.metadata.timestamp).toLocaleString()}</p>
        <p><strong>Status:</strong> <span className={`font-medium ${status === 'approved' ? 'text-green-600' : status === 'rejected' ? 'text-red-600' : status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>{status}</span></p>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <div className="flex space-x-2 mt-4">
        <button
          onClick={handleAuthorize}
          disabled={isLoading || status === 'approved' || status === 'rejected'}
          className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
            isLoading || status === 'approved' || status === 'rejected'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isLoading ? 'Authorizing...' : status === 'approved' ? 'Already Authorized' : 'Authorize User'}
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading || status === 'rejected' || status === 'approved'}
          className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
            isLoading || status === 'rejected' || status === 'approved'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isLoading ? 'Rejecting...' : status === 'rejected' ? 'Already Rejected' : 'Reject Request'}
        </button>
      </div>
    </div>
  );
}