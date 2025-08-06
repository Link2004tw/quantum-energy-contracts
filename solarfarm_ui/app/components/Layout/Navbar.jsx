// // Prompt: Make Navbar mobile-friendly with hamburger menu, touch-friendly buttons, and responsive layout
// "use client";

// import React, { useCallback, useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useAuth } from "@/app/store";
// import PrimaryButton from "../UI/PrimaryButton";
// import UnderlineButton from "../UI/UnderlineButton";
// import { getAuth, onAuthStateChanged } from "firebase/auth";
// import NavLink from "../UI/NavLink";
// import IconButton from "../UI/IconButton";
// import { auth as a } from "@/config/firebase";

// export default function Navbar() {
//   const router = useRouter();
//   const authContext = useAuth();
//   const [role, setRole] = useState(null); // null = loading, 'admin' or 'user'
//   const [loading, setLoading] = useState(true);
//   // Changed: Add state for hamburger menu toggle
//   const [isMenuOpen, setIsMenuOpen] = useState(false);

//   // Fetch user role from /api/verify-role
//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(a, async (user) => {
//       const auth = getAuth();
//       const fetchRole = async () => {
//         if (authContext.isLoggedIn && auth.currentUser) {
//           try {
//             const token = await auth.currentUser.getIdToken();
//             const response = await fetch("/api/verify-role", {
//               method: "GET",
//               headers: { Authorization: `Bearer ${token}` },
//             });
//             if (response.ok) {
//               const data = await response.json();
//               setRole(data.role || "user");
//             } else {
//               console.error("Failed to verify role:", await response.json());
//               setRole("user");
//             }
//           } catch (error) {
//             console.error("Error fetching role:", error);
//             setRole("user");
//           }
//         } else {
//           setRole(null);
//         }
//         setLoading(false);
//       };
//       await fetchRole();
//     });
//     return () => unsubscribe();
//   }, [authContext.isLoggedIn]);

//   const navigateTo = useCallback(
//     (e, path) => {
//       e.preventDefault();
//       router.push(path);
//       // Changed: Close menu on navigation
//       setIsMenuOpen(false);
//     },
//     [router]
//   );

//   const signingOutHandler = useCallback(async () => {
//     try {
//       await authContext.signOutHandler();
//       router.push("/login");
//       // Changed: Close menu on sign-out
//       setIsMenuOpen(false);
//     } catch (error) {
//       console.error("Error signing out:", error);
//       // Changed: Use modal for error on mobile
//       setErrorModal({
//         isOpen: true,
//         message: "Failed to sign out. Please try again.",
//       });
//     }
//   }, [authContext, router]);

//   // Define links with role-based access
//   const links = [
//     { href: "/", label: "Dashboard", roles: ["user"] },
//     {
//       href: "/buySolar",
//       label: "Buy Solar",
//       roles: ["user"],
//       requiresAuth: true,
//     },
//     { href: "/orders", label: "Orders", roles: ["user"], requiresAuth: true },
//     {
//       href: "/admin",
//       label: "Admin Dashboard",
//       roles: ["admin"],
//       requiresAuth: true,
//     },
//     {
//       href: "/admin/add-energy",
//       label: "Add Energy",
//       roles: ["admin"],
//       requiresAuth: true,
//     },
//     {
//       href: "/admin/update-price",
//       label: "Update Price",
//       roles: ["admin"],
//       requiresAuth: true,
//     },
//     {
//       href: "/admin/users",
//       label: "Manage Users",
//       roles: ["admin"],
//       requiresAuth: true,
//     },
//     {
//       href: "/admin/requests",
//       label: "Manage Requests",
//       roles: ["admin"],
//       requiresAuth: true,
//     },
//   ];

//   // Filter links based on role and authentication
//   const visibleLinks =
//     loading || !authContext.isLoggedIn
//       ? links.filter((link) => !link.requiresAuth)
//       : links.filter((link) => link.roles.includes(role));

//   return (
//     <nav className="flex flex-col md:flex-row rounded-md mt-0 items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-400 shadow-lg">
//       <div className="flex items-center justify-between w-full md:w-auto">
//         <NavLink href="/" className="text-2xl font-bold text-white">
//           <h1 className="text-white">Solar Farm</h1>
//         </NavLink>
//         {/* Changed: Hamburger button for mobile */}
//         <button
//           className="md:hidden text-white focus:outline-none"
//           onClick={() => setIsMenuOpen(!isMenuOpen)}
//           aria-label="Toggle menu"
//         >
//           <svg
//             className="w-6 h-6"
//             fill="none"
//             stroke="currentColor"
//             viewBox="0 0 24 24"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               strokeWidth={2}
//               d={
//                 isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"
//               }
//             />
//           </svg>
//         </button>
//       </div>
//       {/* Changed: Collapsible menu for mobile */}
//       <div
//         className={`${
//           isMenuOpen ? "flex" : "hidden"
//         } md:flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full md:w-auto mt-4 md:mt-0`}
//       >
//         {visibleLinks.map((link) => (
//           <NavLink
//             key={link.href}
//             href={link.href}
//             className="text-white hover:text-blue-200 transition-colors duration-200 text-base md:text-lg py-2 md:py-0"
//             activeClassName="font-semibold border-b-2 border-white"
//             onClick={(e) => navigateTo(e, link.href)}
//           >
//             {link.label}
//           </NavLink>
//         ))}
//       </div>
//       <div
//         className={`${
//           isMenuOpen ? "flex" : "hidden"
//         } md:flex flex-col md:flex-row items-center gap-4 w-full md:w-auto mt-4 md:mt-0`}
//       >
//         {loading ? (
//           // Changed: Add spinner for loading
//           <div className="flex items-center gap-2 text-white text-base">
//             <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
//               <circle
//                 className="opacity-25"
//                 cx="12"
//                 cy="12"
//                 r="10"
//                 stroke="currentColor"
//                 strokeWidth="4"
//               />
//               <path
//                 className="opacity-75"
//                 fill="currentColor"
//                 d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"
//               />
//             </svg>
//             Loading...
//           </div>
//         ) : !authContext.isLoggedIn ? (
//           <>
//             <PrimaryButton
//               title="Sign In"
//               onClick={(e) => navigateTo(e, "/login")}
//               className="bg-white text-blue-600 hover:bg-blue-100 px-6 py-3 rounded-lg transition-colors duration-200 text-base w-full md:w-auto"
//             />
//             <UnderlineButton
//               title="Sign Up"
//               onClick={(e) => navigateTo(e, "/signup")}
//               className="text-white hover:text-blue-200 text-base py-2 w-full md:w-auto"
//             />
//           </>
//         ) : (
//           <>
//             <UnderlineButton
//               title={authContext.user?.username || "Profile"}
//               onClick={(e) => navigateTo(e, "/profile")}
//               className="text-white hover:text-blue-200 text-base py-2 w-full md:w-auto align-center items-center justify-center"
//             />
//             <IconButton
//               onClick={signingOutHandler}
//               className="bg-white text-blue-600 hover:bg-blue-100 px-6 py-3 rounded-lg align-center items-center justify-center transition-colors duration-200 w-full md:w-auto"
//             />
//           </>
//         )}
//       </div>
//     </nav>
//   );
// }

/* Prompt: Make Navbar mobile-friendly with hamburger menu, touch-friendly buttons, and responsive layout; ensure navbar closes when a link is clicked */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/store";
import PrimaryButton from "../UI/PrimaryButton";
import UnderlineButton from "../UI/UnderlineButton";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import NavLink from "../UI/NavLink";
import IconButton from "../UI/IconButton";
import { auth as a } from "@/config/firebase";

export default function Navbar() {
  const router = useRouter();
  const authContext = useAuth();
  const [role, setRole] = useState(null); // null = loading, 'admin' or 'user'
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Fetch user role from /api/verify-role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(a, async (user) => {
      const auth = getAuth();
      const fetchRole = async () => {
        if (authContext.isLoggedIn && auth.currentUser) {
          try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch("/api/verify-role", {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
              const data = await response.json();
              setRole(data.role || "user");
            } else {
              console.error("Failed to verify role:", await response.json());
              setRole("user");
            }
          } catch (error) {
            console.error("Error fetching role:", error);
            setRole("user");
          }
        } else {
          setRole(null);
        }
        setLoading(false);
      };
      await fetchRole();
    });
    return () => unsubscribe();
  }, [authContext.isLoggedIn]);

  // Changed: Updated navigateTo to close menu on all link clicks
  const navigateTo = useCallback(
    (e, path) => {
      e.preventDefault();
      router.push(path);
      setIsMenuOpen(false);
    },
    [router]
  );

  // Changed: Updated signingOutHandler to close menu
  const signingOutHandler = useCallback(async () => {
    try {
      await authContext.signOutHandler();
      router.push("/login");
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to sign out. Please try again.",
      });
    }
  }, [authContext, router]);

  // Define links with role-based access
  const links = [
    { href: "/", label: "Dashboard", roles: ["user"] },
    {
      href: "/buySolar",
      label: "Buy Solar",
      roles: ["user"],
      requiresAuth: true,
    },
    { href: "/orders", label: "Orders", roles: ["user"], requiresAuth: true },
    {
      href: "/admin",
      label: "Admin Dashboard",
      roles: ["admin"],
      requiresAuth: true,
    },
    {
      href: "/admin/add-energy",
      label: "Add Energy",
      roles: ["admin"],
      requiresAuth: true,
    },
    {
      href: "/admin/update-price",
      label: "Update Price",
      roles: ["admin"],
      requiresAuth: true,
    },
    {
      href: "/admin/users",
      label: "Manage Users",
      roles: ["admin"],
      requiresAuth: true,
    },
    {
      href: "/admin/requests",
      label: "Manage Requests",
      roles: ["admin"],
      requiresAuth: true,
    },
  ];

  // Filter links based on role and authentication
  const visibleLinks =
    loading || !authContext.isLoggedIn
      ? links.filter((link) => !link.requiresAuth)
      : links.filter((link) => link.roles.includes(role));

  return (
    <nav className="flex flex-col md:flex-row rounded-md mt-0 items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-400 shadow-lg">
      <div className="flex items-center justify-between w-full md:w-auto">
        <NavLink
          href="/"
          className="text-2xl font-bold text-white"
          onClick={(e) => navigateTo(e, "/")}
        >
          <h1 className="text-white">Solar Farm</h1>
        </NavLink>
        <button
          className="md:hidden text-white focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"
              }
            />
          </svg>
        </button>
      </div>
      <div
        className={`${
          isMenuOpen ? "flex" : "hidden"
        } md:flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full md:w-auto mt-4 md:mt-0`}
      >
        {visibleLinks.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            className="text-white hover:text-blue-200 transition-colors duration-200 text-base md:text-lg py-2 md:py-0"
            activeClassName="font-semibold border-b-2 border-white"
            onClick={(e) => navigateTo(e, link.href)}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      <div
        className={`${
          isMenuOpen ? "flex" : "hidden"
        } md:flex flex-col md:flex-row items-center gap-4 w-full md:w-auto mt-4 md:mt-0`}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-white text-base">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"
              />
            </svg>
            Loading...
          </div>
        ) : !authContext.isLoggedIn ? (
          <>
            <PrimaryButton
              title="Sign In"
              onClick={(e) => navigateTo(e, "/login")}
              className="bg-white text-blue-600 hover:bg-blue-100 px-6 py-3 rounded-lg transition-colors duration-200 text-base w-full md:w-auto"
            />
            <UnderlineButton
              title="Sign Up"
              onClick={(e) => navigateTo(e, "/signup")}
              className="text-white hover:text-blue-200 text-base py-2 w-full md:w-auto"
            />
          </>
        ) : (
          <>
            <UnderlineButton
              title={authContext.user?.username || "Profile"}
              onClick={(e) => navigateTo(e, "/profile")}
              className="text-white hover:text-blue-200 text-base py-2 w-full md:w-auto align-center items-center justify-center"
            />
            <IconButton
              onClick={signingOutHandler}
              className="bg-white text-blue-600 hover:bg-blue-100 px-6 py-3 rounded-lg align-center items-center justify-center transition-colors duration-200 w-full md:w-auto"
            />
          </>
        )}
      </div>
    </nav>
  );
}
