"use client";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-11/12 md:w-4/5 lg:w-3/5 bg-white shadow-lg rounded-2xl flex justify-between items-center p-4 z-50">
      {/* Logo Only */}
      <div className="flex justify-center w-full">
        <Image src="/logo-icon.svg" width={50} height={50} alt="logo" />
      </div>

      {/* Mobile Hamburger */}
      {/* <div className="md:hidden flex items-center">
        <button
          title=""
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-col gap-1"
        >
          <Menu color="#000" />
        </button>
      </div> */}

      {/* Mobile Menu */}
      {/* {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white shadow-lg flex flex-col items-center py-4 md:hidden gap-4 rounded-2xl my-2">
          <Link
            href="https://stanlyegypt.com/?v=890e1209a1dd"
            className="font-semibold text-black"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          <Link
            href="https://stanlyegypt.com/about/?v=890e1209a1dd"
            className="font-semibold text-black"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
          <Link
            href="https://stanlyegypt.com/trips/?v=890e1209a1dd"
            className="font-semibold text-black"
            onClick={() => setIsOpen(false)}
          >
            Trips
          </Link>
          <Link
            href="https://stanlyegypt.com/contact-us/?v=890e1209a1dd"
            className="font-semibold text-black"
            onClick={() => setIsOpen(false)}
          >
            Contact Us
          </Link>
        </div>
      )} */}
    </nav>
  );
};

export default Navbar;
