import React from "react";
import { Button } from "./ui/button";
import { Cookie, Refrigerator, Sparkles } from "lucide-react";
import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import HowToCookModal from "./HowToCookModal";
import PricingModal from "./PricingModal";
import Image from "next/image";
import { checkUser } from "@/lib/checkUser";
import { Badge } from "./ui/badge";
import UserDropdown from "./UserDropdown";

export default async function Header() {
  const user = await checkUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/95 backdrop-blur">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">

        {/* Logo */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2 group"
        >
          <div className="relative h-9 w-9 overflow-hidden rounded-xl">
            <Image
              src="/logo.png"
              alt="Servd"
              fill
              sizes="36px"
              className="object-contain"
            />
          </div>

          <span className="text-xl font-bold text-stone-800">
            Servd
          </span>
        </Link>

        {/* Navigation Links */}
        {user && (
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-stone-600">
            <Link
              href="/recipes"
              className="hover:text-orange-600 transition-colors flex gap-1.5 items-center"
            >
              <Cookie className="w-4 h-4" />
              My Recipes
            </Link>

            <Link
              href="/pantry"
              className="hover:text-orange-600 transition-colors flex gap-1.5 items-center"
            >
              <Refrigerator className="w-4 h-4" />
              My Pantry
            </Link>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <HowToCookModal />

          {user ? (
            <>
              {/* Pricing */}
              <PricingModal subscriptionTier={user.subscriptionTier}>
                <Badge
                  variant="outline"
                  className={`flex h-8 px-3 gap-1.5 rounded-full text-xs font-semibold transition-all ${
                    user.subscriptionTier === "pro"
                      ? "bg-linear-to-r from-orange-600 to-amber-500 text-white border-none shadow-sm"
                      : "bg-stone-200/50 text-stone-600 border-stone-200 cursor-pointer hover:bg-stone-300/50"
                  }`}
                >
                  <Sparkles
                    className={`h-3 w-3 ${
                      user.subscriptionTier === "pro"
                        ? "text-white fill-white/20"
                        : "text-stone-500"
                    }`}
                  />

                  <span>
                    {user.subscriptionTier === "pro"
                      ? "Pro Chef"
                      : "Free Plan"}
                  </span>
                </Badge>
              </PricingModal>

              <UserDropdown />
            </>
          ) : (
            <>
              {/* Sign In */}
              <SignInButton mode="modal">
                <Button
                  variant="ghost"
                  className="text-stone-600 hover:text-orange-600 hover:bg-orange-50 font-medium"
                >
                  Sign In
                </Button>
              </SignInButton>

              {/* Sign Up */}
              <SignUpButton mode="modal">
                <Button
                  variant="primary"
                  className="rounded-full px-6"
                >
                  Get Started
                </Button>
              </SignUpButton>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
