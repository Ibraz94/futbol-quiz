"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Login: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch("https://api.futbolquiz.staging.pegasync.com/auth/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let message = "Login failed";
        try {
          const data = await res.json();
          message = data.message || message;
        } catch {
          message = await res.text();
        }
        throw new Error(message);
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      window.dispatchEvent(new Event("storage"));
      // alert("Login successful!");
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#181c24] to-[#10131a] px-2">
      <div className="
      w-full
      max-w-md
      sm:max-w-lg
      md:max-w-xl
      lg:max-w-4xl
      bg-[#23243a]
      rounded-2xl
      shadow-lg
      p-4
      sm:px-8 sm:py-8
      md:px-10 md:py-10
      lg:p-20
      border border-gray-700
      flex flex-col justify-center
      min-h-[500px] md:min-h-[750px]
      mt-8 md:mt-16
      ">
        <h1 className="text-3xl md:text-6xl font-bold text-center text-white mb-2 md:mb-6">Welcome Back!</h1>
        <p className="text-center text-gray-300 mb-4 md:mb-12 text-base md:text-xl">We're so excited to see you again!</p>
        <form className="space-y-6 md:space-y-10 flex-1 flex flex-col justify-center" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-base md:text-lg text-gray-300 mb-2">EMAIL</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 md:px-6 md:py-5 rounded-xl text-base md:text-xl"
              style={{
                backgroundColor: "#E6F0FF",
                color: "#23243a",
                border: "none",
                fontSize: "1.1rem",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-base md:text-lg text-gray-300 mb-2">PASSWORD</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 md:px-6 md:py-5 rounded-xl text-base md:text-xl"
              style={{
                backgroundColor: "#E6F0FF",
                color: "#23243a",
                border: "none",
                fontSize: "1.1rem",
                outline: "none",
              }}
            />
            {/* <Link
              href="#"
              className="block mt-2 text-base md:text-lg text-cyan-400 hover:underline"
            >
              Forgot your password?
            </Link> */}
          </div>
          {error && <div className="text-red-500 text-center">{error}</div>}
          <button
            type="submit"
            className="w-full py-3 md:py-5 rounded-xl bg-[#3b27ff] text-white font-semibold text-lg md:text-2xl hover:bg-[#5f47ff] transition"
          >
            Log In
          </button>
        </form>
        <div className="mt-6 md:mt-10 text-center text-gray-400 text-base md:text-lg">
          Need an account?{" "}
          <Link href="/register" className="text-cyan-400 hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;