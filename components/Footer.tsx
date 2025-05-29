import Link from 'next/link';
import { Instagram, Facebook, Twitter } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-[#0E0E0E] text-white">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Top Section with Navigation and Social Media */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
          {/* Navigation Links */}
          <nav className="flex flex-wrap gap-6 mb-4 lg:mb-0">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="" className="text-gray-300 hover:text-white transition-colors">
              About Us
            </Link>
            <Link href="" className="text-gray-300 hover:text-white transition-colors">
              Review
            </Link>
            <Link href="" className="text-gray-300 hover:text-white transition-colors">
              How To Play
            </Link>
            <Link href="" className="text-gray-300 hover:text-white transition-colors">
              Contact Us
            </Link>
          </nav>

          {/* Social Media Icons */}
          <div className="flex items-center gap-4">
            <span className="text-gray-300 mr-2">Follow Us:</span>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              <Instagram size={20} />
            </a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              <Facebook size={20} />
            </a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              <Twitter size={20} />
            </a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Disclaimer Text */}
        <div className="text-center mb-8">
          <p className="text-[#848484] text-sm leading-relaxed  mx-auto">
            The Information Provided On The Fantasy Flex Website Is For General Informational Purposes Only. While We Strive To Keep The Content Accurate And Up To Date, We Make No Representations Or 
            Warranties Of Any Kind, Express Or Implied, About The Completeness, Accuracy, Reliability, Suitability, Or Availability With Respect To The Website Or The Information, Products, Services, Or Related 
            Graphics Contained On The Website For Any Purpose. Any Reliance You Place On Such Information Is Therefore Strictly At Your Own Risk.
          </p>
        </div>

        {/* BeGambleAware Logo */}
        <div className="flex justify-center mb-6">
            <Image src="/gamble-aware.svg" alt="BeGambleAware" width={225} height={26} />
        </div>
      </div>

      {/* Bottom Copyright Section */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-400">
            <div className="mb-2 sm:mb-0">
              Copyright © 2025. <Link href="/" className="text-accent hover:text-white">futbolquiz.com</Link> | All Right Reserved
            </div>
            <div className="flex gap-4">
              <Link href="" className="hover:text-white transition-colors">
                Terms & conditions
              </Link>
              <span>|</span>
              <Link href="" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
