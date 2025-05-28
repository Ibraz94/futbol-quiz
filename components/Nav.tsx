"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const links = [
  {
    name: 'HOME',
    path: "/"
  },
  {
    name: 'ABOUT',
    path: "/about"
  },
  {
    name: 'GAMES',
    path: "/games"
  },
  {
    name: 'LIVE',
    path: "/live"
  },
];

const Nav = () => {
  const pathname = usePathname();

  return (
    <nav className="flex gap-10">  
      {links.map((link, index) => {
        return (
          <Link href={link.path} key={index} className={`${link.path === pathname &&
            "text-accent border-accent"
            }capitalize font-semibold text-sm hover:text-accent transition-all`}>
            {link.name}
          </Link>
        );
      })}

    </nav>
  )
}

export default Nav