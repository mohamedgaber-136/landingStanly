"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const LoginSection: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "https://api.stanlyegypt.com/api/v1";
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const result = await response.json();

      // Store the token
      localStorage.setItem("authToken", result.token || result.accessToken);
      localStorage.setItem("userData", JSON.stringify(result.user || result));

      // Check if there's a pending booking and redirect appropriately
      const pendingBooking = localStorage.getItem("pendingBooking");
      if (pendingBooking) {
        try {
          const bookingData = JSON.parse(pendingBooking);
          // Always redirect to home page where the restoration logic will handle it
          router.push("/");
        } catch (error) {
          console.error("Error parsing pending booking during login:", error);
          localStorage.removeItem("pendingBooking");
          router.push("/");
        }
      } else {
        router.push("/");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <section className="border-red-500 bg-gray-200 p-3 min-h-screen flex items-center justify-center">
      <div className="bg-gray-100 p-5 flex rounded-2xl shadow-lg max-w-3xl w-full">
        {/* Left Form */}
        <div className="md:w-1/2 px-5 w-full">
          <h2 className="text-2xl font-bold text-[#002D74]">Login</h2>
          <p className="text-sm mt-4 text-[#002D74]">
            If you have an account, please login
          </p>

          <form className="mt-6" onSubmit={handleLogin}>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-gray-700" htmlFor="email">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                placeholder="Enter Email Address"
                className="w-full px-4 py-3 rounded-lg bg-gray-200 mt-2 border focus:border-blue-500 focus:bg-white focus:outline-none"
                autoFocus
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full block bg-blue-500 hover:bg-blue-400 focus:bg-blue-400 text-white font-semibold rounded-lg px-4 py-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Logging in..." : "Log In"}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-7 grid grid-cols-3 items-center text-gray-500">
            <hr className="border-gray-500" />
            <p className="text-center text-sm">OR</p>
            <hr className="border-gray-500" />
          </div>

          {/* Register */}
          <div className="text-sm flex justify-between items-center mt-3">
            <p>If you don't have an account...</p>
            <button
              onClick={() => {
                router.push("/signup");
              }}
              className="py-2 px-5 ml-3 bg-white border rounded-xl hover:scale-110 duration-300 border-blue-400"
            >
              Register
            </button>
          </div>
        </div>

        {/* Right Image */}
        <div className="w-1/2 md:block hidden">
          <Image
            src="/siwa.jpg"
            alt="page img"
            width={700}
            height={100}
            className="rounded-2xl h-full object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default LoginSection;
