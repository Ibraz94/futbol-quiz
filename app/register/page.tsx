"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";

const Register: React.FC = () => {
    const router = useRouter();
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        agree: false,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch("http://localhost:5000/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    fullname: form.name,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Registration failed");
            }
            router.push("/login");

            alert("Registration successful!");
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#181c24] to-[#10131a] px-2">
            <div className="w-full max-w-4xl bg-[#23243a] rounded-2xl shadow-lg p-4 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:p-20 border border-gray-700 flex flex-col justify-center mt-8 md:mt-16">
                <h1 className="text-3xl md:text-5xl font-bold text-center text-white mb-2">Sign Up For User Registration</h1>
                <p className="text-center text-gray-300 mb-8 text-base md:text-lg">Create Your Futbolquiz Account</p>
                <hr className="border-gray-600 mb-8" />
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative">
                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                            <input
                                type="text"
                                name="name"
                                placeholder="Full Name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                className="w-full pl-10 pr-4 py-4 rounded-lg bg-[#292b3e] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base"
                            />
                        </div>
                        <div className="relative">
                            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                            <input
                                type="email"
                                name="email"
                                placeholder="Email Address"
                                value={form.email}
                                onChange={handleChange}
                                required
                                className="w-full pl-10 pr-4 py-4 rounded-lg bg-[#292b3e] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base"
                            />
                        </div>
                        <div className="relative">
                            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={form.password}
                                onChange={handleChange}
                                required
                                className="w-full pl-10 pr-4 py-4 rounded-lg bg-[#292b3e] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base"
                            />
                        </div>
                        <div className="relative">
                            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm Password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                required
                                className="w-full pl-10 pr-4 py-4 rounded-lg bg-[#292b3e] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 text-base"
                            />
                        </div>
                    </div>
                    {/* <div className="flex items-center mb-2">
                        <input
                            type="checkbox"
                            name="agree"
                            checked={form.agree}
                            onChange={handleChange}
                            className="form-checkbox h-5 w-5 text-blue-600 bg-[#292b3e] border-gray-700 rounded focus:ring-blue-600"
                            required
                        />
                        <span className="ml-3 text-gray-300 text-sm">
                            I agree to the <span className="underline cursor-pointer">Terms of Service</span>
                        </span>
                    </div> */}
                    <button
                        type="submit"
                        className="w-full py-4 rounded-lg bg-[#3b27ff] text-white font-semibold text-lg md:text-xl hover:bg-[#5f47ff] transition"
                    >
                        Create account
                    </button>
                </form>
                <div className="mt-8 text-center text-gray-400 text-base">
                    Do have already account?{" "}
                    <Link href="/login" className="text-cyan-400 hover:underline">
                        Click here to sign In.
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;