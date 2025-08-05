import User from "./user";
import CommittedOrders from "./commitedOrders";
import EnergyTransaction from "./energyTransaction";
import AuthorizationRequest from "./request";
import Transaction from "./transaction";
import { v4 as uuidv4 } from 'uuid';

// AI Prompt: "Generate 10 dummy user objects for a User class with fields email, username, password, birthday, ethereumAddress, uid, and energy, ensuring valid Ethereum addresses and varied energy values for a Web3 energy trading demo."
// AI-generated data for user objects, modified to ensure unique Ethereum addresses and role alignment.

export const dummyUsers = [
  new User({
    email: "alice.smith@example.com",
    username: "alice_smith",
    password: "SecurePass123!",
    birthday: "1990-01-15",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79cc",
    uid: "user_001",
    energy: 500,
  }),
  new User({
    email: "bob.johnson@example.com",
    username: "bob_johnson",
    password: "Password456@",
    birthday: "1985-03-22",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c3",
    uid: "user_002",
    energy: 0,
  }),
  new User({
    email: "carol.williams@example.com",
    username: "carol_williams",
    password: "SafeWord789#",
    birthday: "1995-07-10",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c1",
    uid: "user_003",
    energy: 200,
  }),
  new User({
    email: "david.brown@example.com",
    username: "david_brown",
    password: "StrongPass321$",
    birthday: "1988-09-05",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c0",
    uid: "user_004",
    energy: 0,
  }),
  new User({
    email: "emma.davis@example.com",
    username: "emma_davis",
    password: "Pass123!Secure",
    birthday: "1992-11-18",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c5",
    uid: "user_005",
    energy: 1000,
  }),
  new User({
    email: "frank.miller@example.com",
    username: "frank_miller",
    password: "Miller789#Pass",
    birthday: "1980-02-27",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79cb",
    uid: "user_006",
    energy: 0,
  }),
  new User({
    email: "grace.wilson@example.com",
    username: "grace_wilson",
    password: "Wilson456$Safe",
    birthday: "1997-04-14",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79ca",
    uid: "user_007",
    energy: 300,
  }),
  new User({
    email: "henry.moore@example.com",
    username: "henry_moore",
    password: "Henry123!Pass",
    birthday: "1983-06-30",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c6",
    uid: "user_008",
    energy: 0,
  }),
  new User({
    email: "isabella.taylor@example.com",
    username: "isabella_taylor",
    password: "Taylor789#Secure",
    birthday: "1991-08-21",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79cd",
    uid: "user_009",
    energy: 150,
  }),
  new User({
    email: "james.jackson@example.com",
    username: "james_jackson",
    password: "Jackson456$Pass",
    birthday: "1986-12-12",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79cf",
    uid: "user_010",
    energy: 0,
  }),
];

// AI Prompt: "Generate 6 dummy order objects for a CommittedOrders class with fields energyRequested, transactionHash, uid, ethereumAddress, nonce, and createdAt, associated with specific users from a provided list, ensuring valid transaction hashes and Ethereum addresses for a Web3 energy trading demo."
// AI-generated data for order objects, modified to align with user roles and ensure unique transaction hashes.

export const dummyOrders = [
  new CommittedOrders({
    energyRequested: 500,
    transactionHash:
      "0xf6464577b6be8b6cae21ea51ab58aac6378996a827901ec2714bd658ce4a36b5",
    uid: "user_001",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    nonce: 1,
    createdAt: "2025-07-29T10:00:00Z",
    status: "success",
    type: "addEnergy",
  }),
  new CommittedOrders({
    energyRequested: 200,
    transactionHash:
      "0xf6464577b6be8b6cae21ea51ab58aac6378996a827901ec2714bd658ce4a36b7",
    uid: "user_003",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    nonce: 2,
    createdAt: "2025-07-29T12:30:00Z",
    status: "success",
    type: "buySolar",
  }),
  new CommittedOrders({
    energyRequested: 150,
    transactionHash:
      "0xf6464577b6be8b6cae21ea51ab58aac6378996a827901ec2714bd658ce4a36b8",
    uid: "user_008",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    nonce: 5,
    createdAt: "2025-07-30T11:10:00Z",
    status: "failed",
    error: "Not authorized on contract",
    type: "buySolar",
  }),
  new CommittedOrders({
    energyRequested: 300,
    transactionHash:
      "0xf6464577b6be8b6cae21ea51ab58aac6378996a827901ec2714bd658ce4a36b9",
    uid: "user_002",
    ethereumAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    nonce: 4,
    createdAt: "2025-07-30T14:00:00Z",
    status: "failed",
    error: "User not authenticated",
    type: "buySolar",
  }),
];

// AI Prompt: "Generate 6 dummy EnergyTransaction objects for a class with fields energyAmountKwh, transactionId, timestamp, reqHash, and conHash, associated with users and their CommittedOrders, ensuring valid transaction hashes and reflecting role-based access (Authorized users succeed, Wallet Unauthorized fails) for a Web3 energy trading demo."
// AI-generated data for transaction objects, modified to align with user roles, CommittedOrders, and ensure unique transaction IDs.

export const dummyEnergyTransactions = [
  new EnergyTransaction({
    energyAmountKwh: 500,
    transactionId: uuidv4(),
    timestamp: "2025-07-30T10:05:00Z",
    reqHash:
      "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
    conHash:
      "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b",
  }),
  new EnergyTransaction({
    energyAmountKwh: 200,
    transactionId: uuidv4(),
    timestamp: "2025-07-30T12:35:00Z",
    reqHash:
      "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
    conHash:
      "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
  }),
  new EnergyTransaction({
    energyAmountKwh: 1000,
    transactionId: uuidv4(),
    timestamp: "2025-07-30T15:50:00Z",
    reqHash:
      "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4",
    conHash:
      "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d",
  }),
  new EnergyTransaction({
    energyAmountKwh: 300,
    transactionId: uuidv4(),
    timestamp: "2025-07-30T09:25:00Z",
    reqHash:
      "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
    conHash:
      "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e",
  }),
  new EnergyTransaction({
    energyAmountKwh: 150,
    transactionId: uuidv4(),
    timestamp: "2025-07-30T11:15:00Z",
    reqHash:
      "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6",
    conHash: null, // Wallet Unauthorized: contract rejects in reveal phase
  }),
  new EnergyTransaction({
    energyAmountKwh: 100,
    transactionId: uuidv4(),
    timestamp: "2025-07-30T14:05:00Z",
    reqHash:
      "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7",
    conHash:
      "0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f",
  }),
];

// AI Prompt: "Generate 6 dummy Transaction objects for a class with fields index, buyer, kWh, pricePerKWhUSD, ethPriceUSD, timestamp, and error, associated with users and their EnergyTransaction objects, ensuring valid Ethereum addresses, realistic pricing ($0.12/kWh, ETH/USD ~$3200–$3400), and role-based outcomes (Authorized users succeed, Wallet Unauthorized fails) for a Web3 energy trading demo."
// AI-generated data for transaction objects, modified to align with user roles, EnergyTransaction objects, and ensure realistic pricing and timestamps.

export const dummyTransactions = [
  new Transaction({
    index: 1,
    buyer: "0x1234567890abcdef1234567890abcdef12345678", // user_001 (Admin)
    kWh: "500",
    pricePerKWhUSD: "12", // 12 cents/kWh
    ethPriceUSD: "3200000000000000000000", // $3200 with 18 decimals
    timestamp: Math.floor(new Date("2025-07-29T10:00:00Z").getTime() / 1000), // Unix seconds
    error: null,
  }),
  new Transaction({
    index: 2,
    buyer: "0x7890abcdef1234567890abcdef1234567890abcd", // user_003 (Authenticated)
    kWh: "200",
    pricePerKWhUSD: "12", // 12 cents/kWh
    ethPriceUSD: "3300000000000000000000", // $3300 with 18 decimals
    timestamp: Math.floor(new Date("2025-07-29T12:30:00Z").getTime() / 1000), // Unix seconds
    error: null,
  }),
  new Transaction({
    index: 3,
    buyer: "0xdef1234567890abcdef1234567890abcdef1234", // user_008 (Authenticated Wallet Not Authenticated)
    kWh: "150",
    pricePerKWhUSD: "12", // 12 cents/kWh
    ethPriceUSD: "3250000000000000000000", // $3250 with 18 decimals
    timestamp: Math.floor(new Date("2025-07-30T11:10:00Z").getTime() / 1000), // Unix seconds
    error: "Not authorized on contract",
  }),
  new Transaction({
    index: 4,
    buyer: "0xabcdef1234567890abcdef1234567890abcdef12", // user_002 (Unauthenticated)
    kWh: "300",
    pricePerKWhUSD: "12", // 12 cents/kWh
    ethPriceUSD: "3400000000000000000000", // $3400 with 18 decimals
    timestamp: Math.floor(new Date("2025-07-30T14:00:00Z").getTime() / 1000), // Unix seconds
    error: "User not authenticated",
  }),
  new Transaction({
    index: 5,
    buyer: "0x0abcdef1234567890abcdef1234567890abcdef1", // user_005 (Authenticated)
    kWh: "1000",
    pricePerKWhUSD: "12", // 12 cents/kWh
    ethPriceUSD: "3350000000000000000000", // $3350 with 18 decimals
    timestamp: Math.floor(new Date("2025-07-30T15:50:00Z").getTime() / 1000), // Unix seconds
    error: null,
  }),
];

// AI Prompt: "Generate 10 dummy AuthorizationRequest objects for a class with fields userId, ethereumAddress, metadata (name, email, reason, timestamp), and status, associated with users from a provided list, ensuring valid Ethereum addresses and role-based statuses (approved for Admin/Authorized, rejected for Unauthorized/Wallet Unauthorized) for a Web3 energy trading demo."
// AI-generated data for authorization request objects, modified to align with user roles and ensure realistic metadata and timestamps.

export const dummyAuthorizationRequests = [
  new AuthorizationRequest(
    "user_001",
    "0x1234567890abcdef1234567890abcdef12345678",
    {
      name: "alice_smith",
      email: "alice.smith@example.com",
      reason: "Admin access for system management",
      timestamp: "2025-07-29T09:00:00Z",
    }
  ),
  new AuthorizationRequest(
    "user_002",
    "0xabcdef1234567890abcdef1234567890abcdef12",
    {
      name: "bob_johnson",
      email: "bob.johnson@example.com",
      reason: "Requesting access to buy solar energy",
      timestamp: "2025-07-29T10:15:00Z",
    }
  ),
  new AuthorizationRequest(
    "user_003",
    "0x7890abcdef1234567890abcdef1234567890abcd",
    {
      name: "carol_williams",
      email: "carol.williams@example.com",
      reason: "Requesting access to purchase solar energy",
      timestamp: "2025-07-29T11:30:00Z",
    }
  ),
  new AuthorizationRequest(
    "user_004",
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    {
      name: "david_brown",
      email: "david.brown@example.com",
      reason: "Requesting access to view transactions",
      timestamp: "2025-07-29T12:45:00Z",
    }
  ),
  new AuthorizationRequest(
    "user_005",
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    {
      name: "emma_davis",
      email: "emma.davis@example.com",
      reason: "Requesting access for large energy purchase",
      timestamp: "2025-07-29T14:00:00Z",
    }
  ),
  new AuthorizationRequest(
    "user_006",
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    {
      name: "frank_miller",
      email: "frank.miller@example.com",
      reason: "Requesting access to buy solar energy",
      timestamp: "2025-07-29T15:15:00Z",
    }
  ),
  new AuthorizationRequest(
    "user_007",
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    {
      name: "grace_wilson",
      email: "grace.wilson@example.com",
      reason: "Requesting access to trade solar energy",
      timestamp: "2025-07-30T08:30:00Z",
    }
  ),
  new AuthorizationRequest(
    "user_008",
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    {
      name: "henry_moore",
      email: "henry.moore@example.com",
      reason: "Requesting contract authorization",
      timestamp: "2025-07-30T10:00:00Z",
    }
  ),
  new AuthorizationRequest(
    "user_009",
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    {
      name: "isabella_taylor",
      email: "isabella.taylor@example.com",
      reason: "Requesting access for small energy purchase",
      timestamp: "2025-07-30T11:15:00Z",
    }
  ),
  new AuthorizationRequest(
    "user_010",
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    {
      name: "james_jackson",
      email: "james.jackson@example.com",
      reason: "Requesting access to view dashboard",
      timestamp: "2025-07-30T12:30:00Z",
    }
  ),
];
dummyAuthorizationRequests[0].updateStatus("approved");
dummyAuthorizationRequests[1].updateStatus("rejected");
dummyAuthorizationRequests[2].updateStatus("approved");
dummyAuthorizationRequests[3].updateStatus("rejected");
dummyAuthorizationRequests[4].updateStatus("pending");
dummyAuthorizationRequests[5].updateStatus("rejected");
dummyAuthorizationRequests[6].updateStatus("approved");
dummyAuthorizationRequests[7].updateStatus("rejected");
dummyAuthorizationRequests[8].updateStatus("approved");
dummyAuthorizationRequests[9].updateStatus("rejected");
// Update status for each request (already set above, but explicitly calling updateStatus for clarity)
