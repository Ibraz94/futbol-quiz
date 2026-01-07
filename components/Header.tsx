'use client'

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import Nav from "./Nav";
import MobileNav from "./MobileNav";
import Image from "next/image";
import GameAwareLink from "./GameAwareLink";


const Header = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const checkLogin = () => {
      setLoggedIn(!!localStorage.getItem("access_token"));
    };

    checkLogin();

    window.addEventListener("storage", checkLogin);
    return () => window.removeEventListener("storage", checkLogin);
  }, []);

  return (
    <header className="py-4 sm:py-6 xl:py-4 text-white border-b border-[#FFFFFF] border-opacity-20">
      <div className="container mx-auto flex justify-between items-center px-4 sm:px-6 lg:px-8">
        {/* Logo Section */}
        <GameAwareLink href="/">
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-semibold flex items-center gap-1 sm:gap-2">
            <span>
              <Image
                src="/logo.svg"
                alt="logo"
                width={32}
                height={32}
                className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-8 xl:h-8"
              />
            </span>
            <span className="hidden xs:inline sm:inline">Futbol Quiz</span>
            <span className="xs:hidden sm:hidden">Futbol Quiz</span>
          </h1>
        </GameAwareLink>

        {/* Desktop Nav - Hidden on mobile/tablet */}
        <div className="hidden xl:block">
          <Nav />
        </div>

        {/* Desktop Action Buttons - Hidden on mobile/tablet */}
        <div className="hidden xl:flex items-center gap-8">
          {/* <Link href="">
            <h1 className="text-base font-normal flex gap-2 hover:text-accent transition-colors">
              <span><Trophy strokeWidth={1} /></span>
              Lider Tablosu
            </h1>
          </Link> */}

          {/* <Link href="">
            <div className="border w-[150px] h-8 rounded-[4px] flex justify-center items-center hover:border-accent hover:text-accent transition-all">
              <h1 className="text-base font-light flex gap-2 items-center justify-center">
                <span><MessageSquarePlus strokeWidth={1} /></span>
                Geri Bildirim
              </h1>
            </div>
          </Link> */}

          {!loggedIn ? (
            <Link href="/login">
              <h1 className="text-base font-normal flex gap-2 hover:text-accent transition-colors">
                <span><UserRound strokeWidth={1} /></span>
                Log In/Sign Up
              </h1>
            </Link>
          ) : (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((open) => !open)}
                className="flex items-center gap-2 hover:text-accent transition-colors"
              >
                <UserRound strokeWidth={1} />
                <span>Profile</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-[#23243a] border border-gray-700 rounded shadow-lg z-50">
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-[#292b3e] text-white"
                    onClick={() => {
                      localStorage.removeItem("access_token");
                      setLoggedIn(false);
                      setDropdownOpen(false);
                      window.dispatchEvent(new Event("storage")); // notify other components
                    }}
                  >
                    Log Out
                  </button>
                  {/* Add more dropdown items here if needed */}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Mobile nav - Shows on mobile/tablet, hidden on desktop */}
        <div className="xl:hidden">
          <MobileNav />
        </div>
      </div>
    </header>
  );
};

export default Header