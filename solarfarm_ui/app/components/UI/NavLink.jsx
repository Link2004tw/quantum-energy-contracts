// 'use client';

// import { usePathname } from 'next/navigation';
// import Link from 'next/link';
// import React from 'react';

// export default function NavLink({ href, children, className = '', activeClassName = '' }) {
//   const pathname = usePathname();
//   const isActive = pathname === href;
//   const combinedClassName = `${className} ${isActive ? activeClassName : ''}`.trim();

//   return (
//     <Link href={href} className={combinedClassName}>
//       {children}
//     </Link>
//   );
// }

/* Prompt: Make Navbar mobile-friendly with hamburger menu, touch-friendly buttons, and responsive layout; ensure navbar closes when a link is clicked */

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import React from "react";

export default function NavLink({
  href,
  children,
  className = "",
  activeClassName = "",
  onClick,
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const combinedClassName = `${className} ${
    isActive ? activeClassName : ""
  }`.trim();

  // Changed: Added onClick prop to the Link component to handle custom click behavior
  return (
    <Link href={href} className={combinedClassName} onClick={onClick}>
      {children}
    </Link>
  );
}
