"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CiMenuFries } from "react-icons/ci";
import Image from "next/image";

const links = [
  {
    name: 'Home',
    path: "/"
  },
  {
    name: 'About',
    path: ""
  },
  {
    name: 'Games',
    path: ""
  },
  {
    name: 'Live',
    path: ""
  },
]

const MobileNav = () => {
  const pathname = usePathname();
  return (
    <Sheet>
      <SheetTrigger className="flex justify-center items-center">
        <CiMenuFries className="text-[28px] sm:text-[32px] text-accent" />
      </SheetTrigger>
      <SheetContent className="flex flex-col w-[280px] sm:w-[350px] px-4 sm:px-6">
        {/* Logo and Title Section */}
        <div className="mt-16 sm:mt-20 lg:mt-32 mb-16 sm:mb-24 lg:mb-40 text-center">
          <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12">
              <Image 
                src="/logo.svg" 
                alt="logo" 
                width={48} 
                height={48}
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-semibold text-center leading-tight">
              Futbol Quiz
            </h1>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex flex-col justify-center items-center gap-4 sm:gap-6 lg:gap-8 flex-1">
          {links.map((link, index) => {
            return (
              <Link 
                href={link.path} 
                key={index}
                className={`${link.path === pathname && "text-accent border-b-2 border-accent"}
                      text-base sm:text-lg lg:text-xl capitalize hover:text-accent transition-all duration-300 
                      py-2 px-4 rounded-md hover:bg-accent/10 w-full text-center
                      border-b border-transparent hover:border-accent/20`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer Space */}
        <div className="pb-8 sm:pb-12">
          <div className="text-center text-xs sm:text-sm text-muted-foreground">
            © 2025 Futbol Quiz
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default MobileNav