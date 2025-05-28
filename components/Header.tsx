'use client'

import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowRightToLine, MessageSquarePlus, Trophy } from "lucide-react";
import Nav from "./Nav";
import MobileNav from "./MobileNav";
import { motion } from "framer-motion";
import Image from "next/image";

const Header = () => {
  return (

    <header className="py-8 xl:py-4 text-white border-b border-[#FFFFFF] border-opacity-20">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/">
          <h1 className="text-4xl font-semibold flex items-center gap-2">
            <span><img src="/logo.svg" alt="logo" /></span>
            Futbol Quiz
          </h1>
        </Link>

        <Nav />

        {/* Desktop Nav */}
        <div className="hidden xl:flex items-center gap-8">
          <Link href="/leaderboard">
            <h1 className="text-base font-normal flex gap-2">
              <span><Trophy strokeWidth={1}/></span>
              Lider Tablosu</h1>
          </Link>

          <Link href="/feedback">
            <div className="border w-[150px] h-8 rounded-[4px] flex justify-center items-center">
              <h1 className="text-base font-light flex gap-2 items-center justify-center">
                <span><MessageSquarePlus strokeWidth={1}/></span>
                Geri Bildirim</h1>
            </div>
          </Link>

          <Link href="/login">
            <h1 className="text-base font-normal flex gap-2">
              <span><ArrowRightToLine strokeWidth={1}/></span>
              Giris Yap</h1>
          </Link>
        </div>

        {/* mobile nav */}
        <div className="xl:hidden">
          <MobileNav />
        </div>
      </div>
    </header>
  );
};

export default Header