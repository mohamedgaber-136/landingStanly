"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const SignUpSection: React.FC = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "https://api.stanlyegypt.com/api/v1";
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const result = await response.json();

      // Store the token
      localStorage.setItem("authToken", result.token || result.accessToken);
      localStorage.setItem("userData", JSON.stringify(result.user || result));

      // Check if there's a pending booking
      const pendingBooking = localStorage.getItem("pendingBooking");
      if (pendingBooking) {
        // Redirect back to home page where the booking modal will restore data
        router.push("/");
      } else {
        router.push("/");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <section className="border-red-500 bg-gray-200 p-3 min-h-screen flex items-center justify-center">
      <div className="bg-gray-100 p-5 flex rounded-2xl shadow-lg max-w-3xl w-full">
        {/* Left Image */}
        <div className="w-1/2 md:block hidden">
          <Image
            src="/Media.jpg"
            alt="page img"
            width={700}
            height={100}
            className="rounded-2xl h-full object-cover"
          />
        </div>
        {/* Right Form */}
        <div className="md:w-1/2 px-5 w-full">
          <h2 className="text-2xl font-bold text-[#002D74]">Sign Up</h2>

          <form className="mt-6" onSubmit={handleSignUp}>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-gray-700" htmlFor="name">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                placeholder="Enter Full Name"
                className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-2 border focus:border-blue-500 focus:bg-white focus:outline-none"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-gray-700" htmlFor="email">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                placeholder="Enter Email Address"
                className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-2 border focus:border-blue-500 focus:bg-white focus:outline-none"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mt-4">
              <label className="block text-gray-700" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                id="password"
                placeholder="Enter Password"
                minLength={6}
                className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-2 border focus:border-blue-500 focus:bg-white focus:outline-none"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <label className="block text-gray-700" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Confirm Password"
                minLength={6}
                className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-2 border focus:border-blue-500 focus:bg-white focus:outline-none"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full block bg-blue-500 hover:bg-blue-400 focus:bg-blue-400 text-white font-semibold rounded-lg px-4 py-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing up..." : "Sign up"}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-sm flex justify-between items-center mt-3">
            <p>Already have an account?</p>
            <button
              onClick={() => router.push("/signin")}
              className="py-2 px-5 ml-3 bg-white border rounded-xl hover:scale-110 duration-300 border-blue-400"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SignUpSection;
