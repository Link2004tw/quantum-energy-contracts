'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/store';
import PrimaryButton from '../UI/PrimaryButton';
import UnderlineButton from '../UI/UnderlineButton';
import { getAuth } from 'firebase/auth';
import NavLink from '../UI/NavLink';
import IconButton from '../UI/IconButton';

export default function Navbar() {
  const router = useRouter();
  const authContext = useAuth();
  const [role, setRole] = useState(null); // null = loading, 'admin' or 'user' after fetch
  const [loading, setLoading] = useState(true);

  // Fetch user role from /api/verify-role
  useEffect(() => {
    const auth = getAuth();
    const fetchRole = async () => {
      if (authContext.isLoggedIn && auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          const response = await fetch('/api/verify-role', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setRole(data.role || 'user');
          } else {
            console.error('Failed to verify role:', await response.json());
            setRole('user');
          }
        } catch (error) {
          console.error('Error fetching role:', error);
          setRole('user');
        }
      } else {
        setRole(null); // No user logged in
      }
      setLoading(false);
    };

    fetchRole();
  }, [authContext.isLoggedIn]);

  const navigateTo = useCallback((e, path) => {
    e.preventDefault();
    router.push(path);
  }, [router]);

  const signingOutHandler = useCallback(async () => {
    try {
      await authContext.signOutHandler();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  }, [authContext, router]);

  // Define links with role-based access
  const links = [
    { href: '/', label: 'Dashboard', roles: ['user'] },
    { href: '/buySolar', label: 'Buy Solar', roles: ['user'], requiresAuth: true },
    { href: '/orders', label: 'Orders', roles: ['user'], requiresAuth: true },
    { href: '/admin', label: 'Admin Dashboard', roles: ['admin'], requiresAuth: true },
    { href: '/admin/add-energy', label: 'Add Energy', roles: ['admin'], requiresAuth: true },
    { href: '/admin/update-price', label: 'Update Price', roles: ['admin'], requiresAuth: true },
    { href: '/admin/users', label: 'Manage Users', roles: ['admin'], requiresAuth: true },
    { href: '/admin/requests', label: 'Manage Requests', roles: ['admin'], requiresAuth: true },
  ];

  // Filter links based on role and authentication status
  const visibleLinks = loading || !authContext.isLoggedIn
    ? links.filter((link) => !link.requiresAuth)
    : links.filter((link) => link.roles.includes(role));

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-400 shadow-lg">
      <div className="flex items-center gap-8">
        <NavLink
          href="/"
          className="text-3xl font-bold text-white"
        >
          <h1 className="text-white">Solar Farm</h1>
        </NavLink>
        <div className="flex items-center gap-6">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              className="text-white hover:text-blue-200 transition-colors duration-200 text-lg"
              activeClassName="font-semibold border-b-2 border-white"
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {loading ? (
          <span className="text-white text-lg">Loading...</span>
        ) : !authContext.isLoggedIn ? (
          <>
            <PrimaryButton
              title="Sign In"
              onClick={(e) => navigateTo(e, '/login')}
              className="bg-white text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors duration-200"
            />
            <UnderlineButton
              title="Sign Up"
              onClick={(e) => navigateTo(e, '/signup')}
              className="text-white hover:text-blue-200"
            />
          </>
        ) : (
          <>
            <UnderlineButton
              title={authContext.user?.username || 'Profile'}
              onClick={(e) => navigateTo(e, '/profile')}
              className="text-white hover:text-blue-200"
            />
            <IconButton
              iconName="arrow-right-start-on-rectangle"
              onClick={signingOutHandler}
              className="bg-white text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors duration-200"
            />
          </>
        )}
      </div>
    </nav>
  );
}