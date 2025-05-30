"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CiMenuFries } from "react-icons/ci";

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
        <CiMenuFries className="text-[32px] text-accent" />
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <div className="mt-32 mb-40 text-center text-2xl">
          <h1 className="text-4xl font-semibold flex items-center gap-2">
            <span><img src="/logo.svg" alt="logo" /></span>
            Futbol Quiz
          </h1>

        </div>
        <nav className="flex flex-col justify-center items-center gap-8">
          {links.map((link, index) => {
            return (
              <Link href={link.path} key={index}
                className={`${link.path === pathname && "text-accent border-b-2 border-accent"}
                      text-xl capitalize hover:text-accent transition-all`}>
                {link.name}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

export default MobileNav