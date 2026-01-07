"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import GameAwareLink from "./GameAwareLink";

const links = [
  {
    name: 'HOME',
    path: "/"
  },
  // {
  //   name: 'ABOUT',
  //   path: ""
  // },
  {
    name: 'BINGO',
    path: "/bingogame"
  },
  // {
  //   name: 'LIVE',
  //   path: ""
  // },
];

const Nav = () => {
  const pathname = usePathname();

  return (
    <nav className="flex gap-10">  
      {links.map((link, index) => {
        return (
          <GameAwareLink 
            href={link.path} 
            key={index} 
            className={`${link.path === pathname &&
              "text-accent border-accent"
              }capitalize font-semibold text-sm hover:text-accent transition-all`}
          >
            {link.name}
          </GameAwareLink>
        );
      })}

    </nav>
  )
}

export default Nav