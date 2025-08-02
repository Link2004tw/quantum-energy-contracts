"use client";

import { createContext, useState, useContext, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import User from "@/models/user";
import { dummyUsers } from "@/models/dummyData";

const initialValue = {
  user: null,
  status: null,
  setCurrentUser: () => {},
  logout: () => {},
  isLoggedIn: false,
  isPaused: false,
  setIsPaused: () => {},
  userRole: "user",
  currentUid: null,
  availableEnergy: 10000, // Default 10,000 kWh
  ethUsdPrice: 0, // Default ETH/USD price
  setEthUsdPrice: () => {},
};

const AuthContext = createContext(initialValue);

const users = [...dummyUsers];

// Map statuses to user IDs and roles
const statusToUser = {
  Admin: { uid: "user_001", role: "admin" },
  Authenticated: { uid: "user_003", role: "user" },
  "Authenticated Wallet Not Authenticated": { uid: "user_008", role: "user" },
  Unauthenticated: { uid: "user_002", role: "user" },
};

export default function AuthWrapper({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [userRole, setUserRole] = useState("user");
  const [currentUid, setCurrentUid] = useState(null);
  const [availableEnergy, setAvailableEnergy] = useState(10000); // Default 10,000 kWh
  const [ethUsdPrice, setEthUsdPrice] = useState(2000e18); // ETH/USD price state
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Client-side route protection
    const isBuySolar = pathname === "/buySolar";
    const isAddEnergy = pathname === "/admin/add-energy";
    const isUpdatePrice = pathname === "/admin/update-price";
    const isAdminRoute = pathname.startsWith("/admin/");

    if (isPaused && (isBuySolar || isAddEnergy || isUpdatePrice)) {
      console.log(
        `Redirecting to ${
          isBuySolar ? "/maintenance" : "/admin/maintenance"
        } due to paused state`
      );
      router.push(isBuySolar ? "/maintenance" : "/admin/maintenance");
    } else if (isAdminRoute && userRole !== "admin") {
      console.log(`Redirecting to /unauthorized: role=${userRole}`);
      router.push("/unauthorized");
    } else if (isAdminRoute && !user) {
      console.log("Redirecting to /unauthorized: no user");
      router.push("/unauthorized");
    }
  }, [pathname, isPaused, userRole, user, router]);

  const setCurrentUser = (selectedStatus) => {
    if (!statusToUser[selectedStatus]) {
      console.warn(`Invalid status provided: ${selectedStatus}`);
      return;
    }
    const { uid, role } = statusToUser[selectedStatus];
    const selectedUser = users.find((u) => u.uid === uid) || null;
    if (selectedUser) {
      console.log(`Setting user for status ${selectedStatus}:`, {
        uid: selectedUser.uid,
        ethereumAddress: selectedUser.ethereumAddress,
        role,
        availableEnergy,
        ethUsdPrice,
      });
      if (!selectedUser.ethereumAddress) {
        console.warn(`User ${uid} is missing ethereumAddress`);
      }
      setUser(selectedUser);
      setStatus(selectedStatus);
      setUserRole(role);
      setCurrentUid(uid);
    } else {
      console.warn(`No user found for UID: ${uid}`);
    }
  };

  const logout = () => {
    console.log("Logging out user");
    setUser(null);
    setStatus(null);
    setUserRole("user");
    setCurrentUid(null);
    setIsPaused(false);
    setAvailableEnergy(10000); // Reset to default
    setEthUsdPrice(0); // Reset to default
  };

  const setIsPausedState = (value) => {
    setIsPaused(value);
    console.log(`Pause state updated: isPaused = ${value}`);
  };

  const value = {
    user,
    status,
    setCurrentUser,
    logout,
    isLoggedIn: !!user,
    isPaused,
    setIsPaused: setIsPausedState,
    userRole,
    currentUid,
    availableEnergy,
    setAvailableEnergy,
    ethUsdPrice,
    setEthUsdPrice,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
