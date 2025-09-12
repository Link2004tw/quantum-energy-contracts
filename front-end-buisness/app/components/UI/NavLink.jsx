'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React from 'react';

export default function NavLink({ href, children, className = '', activeClassName = '' }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const combinedClassName = `${className} ${isActive ? activeClassName : ''}`.trim();

  return (
    <Link href={href} className={combinedClassName}>
      {children}
    </Link>
  );
}