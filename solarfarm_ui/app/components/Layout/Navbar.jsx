'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/store';
import PrimaryButton from '../UI/PrimaryButton';
import UnderlineButton from '../UI/UnderlineButton';
import { getAuth } from 'firebase/auth';
import NavLink from '../UI/NavLink';

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
      console.log('User signed out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  }, [authContext, router]);

  // Define links with role-based access
  const links = [
    { href: '/', label: 'Dashboard', roles: ['user', 'admin'] },
    { href: '/buySolar', label: 'Buy Solar', roles: ['user', 'admin'], requiresAuth: true },
    { href: '/orders', label: 'Orders', roles: ['user', 'admin'], requiresAuth: true },
    { href: '/admin', label: 'Admin Dashboard', roles: ['admin'], requiresAuth: true },
    { href: '/admin/add-energy', label: 'Add Energy', roles: ['admin'], requiresAuth: true },
    { href: '/admin/update-price', label: 'Update Price', roles: ['admin'], requiresAuth: true },
  ];

  // Filter links based on role and authentication status
  const visibleLinks = loading || !authContext.isLoggedIn
    ? links.filter((link) => !link.requiresAuth)
    : links.filter((link) => link.roles.includes(role));

  return (
    <nav className="flex items-center justify-between p-4 bg-blue-200 m-0">
      <div className="flex items-center gap-5">
        <NavLink
          href="/"
          className="text-2xl font-bold text-primary-600"
          activeClassName="underline"
        >
          <h1>Solar Farm</h1>
        </NavLink>
        <div className="flex items-center gap-5">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              className="text-gray-800 hover:text-gray-600 transition-colors"
              activeClassName="font-bold underline"
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {loading ? (
          <span className="text-gray-600">Loading...</span>
        ) : !authContext.isLoggedIn ? (
          <>
            <PrimaryButton
              title="Sign In"
              onClick={(e) => navigateTo(e, '/login')}
            />
            <UnderlineButton
              title="Sign Up"
              onClick={(e) => navigateTo(e, '/signup')}
            />
          </>
        ) : (
          <>
            <UnderlineButton
              title={authContext.user?.username || 'Profile'}
              onClick={(e) => navigateTo(e, '/profile')}
            />
            <PrimaryButton title="Sign Out" onClick={signingOutHandler} />
          </>
        )}
      </div>
    </nav>
  );
}