// "use client";

// import { useState } from "react";
// import User from "../../../models/user";
// import UnderlineButton from "../UI/UnderlineButton";
// import PrimaryButton from "../UI/PrimaryButton";
// import { ethers } from "ethers";
// import Modal from "./Model";

// export default function SigningForm({
//   mode = "signIn", // "signIn" or "signUp"
//   onSubmit,
// }) {
//   const [isWalletConnected, setIsWalletConnected] = useState(false);
//   const [isConnecting, setIsConnecting] = useState(false);
//   const [errorModalOpen, setErrorModalOpen] = useState(false);
//   const [errorMessage, setErrorMessage] = useState(null);

//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//     confirmPassword: "",
//     username: "",
//     birthday: "",
//     ethereumAddress: "",
//   });
//   const [isLoading, setIsLoading] = useState(false);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     try {
//       setIsLoading(true);
//       if (mode === "signUp") {
//         if (!isWalletConnected) {
//           setErrorMessage("Please connect your wallet to sign up.");
//           setErrorModalOpen(true);
//           return;
//         }
//         if (formData.password !== formData.confirmPassword) {
//           alert("Passwords do not match!");
//           return;
//         }
//         console.log("Form data submitted1:", formData.password);
//         const user = new User({
//           email: formData.email,
//           username: formData.username,
//           password: formData.password,
//           birthday: formData.birthday,
//           ethereumAddress: formData.ethereumAddress,
//           energy: 0
//         });
//         onSubmit(user);
//       } else {
//         onSubmit({ email: formData.email, password: formData.password });
//       }
//       //Reset form after submission
//       setFormData({
//         email: "",
//         password: "",
//         confirmPassword: "",
//         username: "",
//         birthday: "",
//         ethereumAddress: "",
//       });
//       setIsWalletConnected(false);
//       alert("Form submitted successfully!");
//     } catch (error) {
//       console.error("Error during form submission:", error);
//       alert(`Failed to submit form: ${error.message}`);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleConnectWallet = async () => {
//     if (!window.ethereum) {
//       setErrorMessage(
//         "MetaMask is not installed. Please install it to continue."
//       );
//       setErrorModalOpen(true);
//       return;
//     }
//     setIsConnecting(true);
//     try {
//       // Request account access from MetaMask
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const accounts = await provider.send("eth_requestAccounts", []);
//       const address = accounts[0];
//       setFormData((prev) => ({ ...prev, ethereumAddress: address }));
//       setIsWalletConnected(true);
//     } catch (error) {
//       console.error("Error connecting to MetaMask:", error);
//       setErrorMessage(error.message || "Failed to connect to MetaMask");
//       setErrorModalOpen(true);
//     } finally {
//       setIsConnecting(false);
//     }
//   };

//   const isSubmitDisabled =
//     !formData.email ||
//     !formData.password ||
//     (mode === "signUp" &&
//       (!formData.username ||
//         !formData.birthday ||
//         formData.password !== formData.confirmPassword));

//   return (
//     <form
//       className="py-4 px-7 bg-primary/5 rounded-md block min-w-fit w-full"
//       onSubmit={handleSubmit}
//     >
//       <label className="block">
//         Email
//         <input
//           type="email"
//           name="email"
//           value={formData.email}
//           onChange={handleChange}
//           required
//           className="block mt-2 my-4 px-2 py-1 rounded-sm w-full"
//         />
//       </label>
//       <label className="block">
//         Password
//         <input
//           type="password"
//           name="password"
//           value={formData.password}
//           onChange={handleChange}
//           required
//           className="block mt-2 my-4 px-2 py-1 rounded-sm w-full"
//         />
//       </label>
//       {mode === "signUp" && (
//         <>
//           <label className="block">
//             Confirm Password
//             <input
//               type="password"
//               name="confirmPassword"
//               value={formData.confirmPassword}
//               onChange={handleChange}
//               required
//               className="block mt-2 my-4 px-2 py-1 rounded-sm w-full"
//             />
//           </label>
//           <label className="block">
//             Username
//             <input
//               type="text"
//               name="username"
//               value={formData.username}
//               onChange={handleChange}
//               required
//               className="block mt-2 my-4 px-2 py-1 rounded-sm w-full"
//             />
//           </label>
//           <label className="block">
//             Birthday
//             <input
//               type="date"
//               name="birthday"
//               value={formData.birthday}
//               onChange={handleChange}
//               required
//               className="block mt-2 my-4 px-2 py-1 rounded-sm w-full"
//             />
//           </label>
//           {isWalletConnected ? (
//             <div className="text-center text-gray-600 my-4">
//               Connected Wallet: {formData.ethereumAddress.slice(0, 6)}...
//               {formData.ethereumAddress.slice(-4)}
//             </div>
//           ) : (
//             <div className="flex justify-center items-center my-4">
//               <PrimaryButton
//                 title={isConnecting ? "Connecting..." : "Connect Wallet"}
//                 onClick={handleConnectWallet}
//                 disabled={isConnecting}
//               />
//             </div>
//           )}
//         </>
//       )}
//       <UnderlineButton
//         title={mode === "signIn" ? "Sign In" : "Sign Up"}
//         type="submit"
//         disabled={isLoading}
//       />
//       <Modal
//         isOpen={errorModalOpen}
//         onClose={() => setErrorModalOpen(false)}
//         onConfirm={() => setErrorModalOpen(false)}
//       >
//         <h2 className="text-xl font-semibold text-gray-800 mb-4">Error</h2>
//         <p className="text-red-600">{errorMessage}</p>
//       </Modal>
//     </form>
//   );
// }
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/store";
import User from "@/models/user";
import UnderlineButton from "../UI/UnderlineButton";
import PrimaryButton from "../UI/PrimaryButton";
import Card from "./Card";
import { ethers } from "ethers";
import Modal from "./Model";
import { truncateEthereumAddress } from "@/utils/tools";

export default function SigningForm({
  mode = "signIn", // "signIn", "signUp", or "update"
  onSubmit,
}) {
  const { user } = useAuth();
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    birthday: "",
    ethereumAddress: "",
  });

  useEffect(() => {
    if (mode === "update" && user) {
      setFormData({
        email: user.email || "",
        password: "",
        confirmPassword: "",
        username: user.username || "",
        birthday: user.birthday
          ? user.birthday.toISOString().split("T")[0]
          : "",
        ethereumAddress: user.ethereumAddress || "",
      });
      setIsWalletConnected(!!user.ethereumAddress);
    }
  }, [mode, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      if (mode === "signIn") {
        if (!formData.email || !formData.password) {
          throw new Error("Email and password are required");
        }
        onSubmit({ email: formData.email, password: formData.password });
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          username: "",
          birthday: "",
          ethereumAddress: "",
        });
        alert("Sign-in submitted successfully!");
      } else if (mode === "signUp") {
        if (!isWalletConnected) {
          throw new Error("Please connect your wallet to sign up.");
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match!");
        }
        const newUser = new User({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          birthday: formData.birthday,
          ethereumAddress: formData.ethereumAddress,
          energy: 0,
        });
        onSubmit(newUser);
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          username: "",
          birthday: "",
          ethereumAddress: "",
        });
        setIsWalletConnected(false);
        alert("Sign-up submitted successfully!");
      } else if (mode === "update") {
        if (!user) {
          throw new Error("No user data available for update");
        }
        if (
          formData.password &&
          formData.password !== formData.confirmPassword
        ) {
          throw new Error("Passwords do not match!");
        }
        const updatedUser = new User({
          uid: user.uid,
          email: formData.email,
          username: formData.username,
          password: formData.password || user._password,
          birthday: formData.birthday,
          ethereumAddress: formData.ethereumAddress || user.ethereumAddress,
          energy: user.energy || 0,
        });
        onSubmit(updatedUser);
        alert("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Error during form submission:", error);
      setErrorMessage(error.message);
      setErrorModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      setErrorMessage(
        "MetaMask is not installed. Please install it to continue."
      );
      setErrorModalOpen(true);
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      setFormData((prev) => ({ ...prev, ethereumAddress: address }));
      setIsWalletConnected(true);
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      setErrorMessage(error.message || "Failed to connect to MetaMask");
      setErrorModalOpen(true);
    } finally {
      setIsConnecting(false);
    }
  };

  const isSubmitDisabled =
    !formData.email ||
    !formData.password ||
    (mode === "signUp" &&
      (!formData.username ||
        !formData.birthday ||
        !isWalletConnected ||
        formData.password !== formData.confirmPassword)) ||
    (mode === "update" &&
      (!formData.email ||
        !formData.username ||
        !formData.birthday ||
        (formData.password && formData.password !== formData.confirmPassword)));

  return (
    <form
      className="py-4 px-7 bg-primary-600/5 rounded-md block min-w-fit w-full"
      onSubmit={handleSubmit}
    >
      {errorMessage && (
        <Modal
          isOpen={errorModalOpen}
          onClose={() => setErrorModalOpen(false)}
          onConfirm={() => setErrorModalOpen(false)}
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Error</h2>
          <p className="text-red-600">{errorMessage}</p>
        </Modal>
      )}
      <label className="block">
        <span className="text-primary-600 font-medium">Email</span>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="block mt-2 my-4 px-2 py-1 rounded-sm w-full border border-primary-800"
        />
      </label>
      <label className="block">
        <span className="text-primary-600 font-medium">Password</span>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required={mode !== "update"}
          placeholder={
            mode === "update" ? "Leave blank to keep current password" : ""
          }
          className="block placeholder-yellow-400 mt-2 my-4 px-2 py-1 rounded-sm w-full border border-primary-800"
        />
      </label>
      {(mode === "signUp" || mode === "update") && (
        <>
          <label className="block">
            <span className="text-primary-600 font-medium">
              Confirm Password
            </span>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required={mode === "signUp" || formData.password}
              placeholder={mode === "update" ? "Confirm new password" : ""}
              className="block placeholder-yellow-400 mt-2 my-4 px-2 py-1 rounded-sm w-full border border-primary-800"
            />
          </label>
          <label className="block">
            <span className="text-primary-600 font-medium">Username</span>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="block placeholder-yellow-300::placeholder mt-2 my-4 px-2 py-1 rounded-sm w-full border border-primary-800"
            />
          </label>
          <label className="block">
            <span className="text-primary-600 font-medium">Birthday</span>
            <input
              type="date"
              name="birthday"
              value={formData.birthday}
              onChange={handleChange}
              required
              className="block mt-2 my-4 px-2 py-1 rounded-sm w-full border border-primary-800"
            />
          </label>
          {isWalletConnected ? (
            <div className="text-center text-primary-600 my-4">
              Connected Wallet:{" "}
              {truncateEthereumAddress(formData.ethereumAddress)}
            </div>
          ) : (
            <div className="flex justify-center items-center my-4">
              <PrimaryButton
                title={isConnecting ? "Connecting..." : "Connect Wallet"}
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="bg-primary-700 hover:bg-primary-800 text-white px-6 py-2 rounded-lg"
              />
            </div>
          )}
        </>
      )}
      <div className="flex justify-center items-center my-4">
        <UnderlineButton
          title={
            isLoading
              ? "Submitting..."
              : mode === "signIn"
              ? "Sign In"
              : mode === "signUp"
              ? "Sign Up"
              : "Update Profile"
          }
          type="submit"
          disabled={isLoading || isSubmitDisabled}
          className="text-primary-600 hover:text-primary-800"
        />
      </div>
    </form>
  );
}
