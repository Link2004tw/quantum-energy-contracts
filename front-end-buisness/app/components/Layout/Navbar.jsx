/* Prompt: add signup and signin links for unauthenticated users to the Navbar component with dummy logic */

"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import NavLink from "../UI/NavLink";
import { useAuth } from "@/app/store";

export default function Navbar() {
  const router = useRouter();
  const { status, setCurrentUser } = useAuth();

  const navigateTo = useCallback(
    (e, path) => {
      e.preventDefault();
      router.push(path);
    },
    [router]
  );

  const handleStatusChange = useCallback(
    (e) => {
      const selectedStatus = e.target.value;
      setCurrentUser(selectedStatus);
    },
    [setCurrentUser]
  );

  // Modified: Added signup and signin links for Unauthenticated status
  const links = [
    {
      href: "/",
      label: "Dashboard",
      statuses: ["Admin", "Authenticated", "Authenticated Wallet Not Authenticated", "Unauthenticated"],
    },
    {
      href: "/buySolar",
      label: "Buy Solar",
      statuses: ["Authenticated", "Authenticated Wallet Not Authenticated"],
    },
    {
      href: "/orders",
      label: "Orders",
      statuses: ["Authenticated", "Authenticated Wallet Not Authenticated"],
    },
    {
      href: "/admin",
      label: "Admin Dashboard",
      statuses: ["Admin"],
    },
    {
      href: "/admin/add-energy",
      label: "Add Energy",
      statuses: ["Admin"],
    },
    {
      href: "/admin/update-price",
      label: "Update Price",
      statuses: ["Admin"],
    },
    {
      href: "/admin/users",
      label: "Manage Users",
      statuses: ["Admin"],
    },
    {
      href: "/admin/requests",
      label: "Manage Requests",
      statuses: ["Admin"],
    },
    // Added: Signup and Signin links for Unauthenticated users
    {
      href: "/signup",
      label: "Sign Up",
      statuses: ["Unauthenticated"],
    },
    {
      href: "/login",
      label: "Sign In",
      statuses: ["Unauthenticated"],
    },
  ];

  // Modified: Filter links based on selected status, including new links
  const visibleLinks = status ? links.filter((link) => link.statuses.includes(status)) : [];

  return (
    <nav className="flex rounded-md mt-0 items-center justify-between px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-400 shadow-lg">
      <div className="flex items-center gap-8">
        <NavLink href="/" className="text-3xl font-bold text-white">
          <h1 className="text-white">Solar Farm</h1>
        </NavLink>
        <div className="flex items-center gap-6">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              className="text-white hover:text-blue-200 transition-colors duration-200 text-lg"
              activeClassName="font-semibold border-b-2 border-white"
              onClick={(e) => navigateTo(e, link.href)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* Dropdown to select status, mapped to users in AuthWrapper */}
        <select
          value={status || ""}
          onChange={handleStatusChange}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors duration-200 text-lg"
        >
          <option value="" disabled>
            Select Status
          </option>
          <option value="Admin">Admin</option>
          <option value="Authenticated">Authenticated</option>
          <option value="Authenticated Wallet Not Authenticated">
            Authenticated Wallet Not Authenticated
          </option>
          <option value="Unauthenticated">Unauthenticated</option>
        </select>
      </div>
    </nav>
  );
}