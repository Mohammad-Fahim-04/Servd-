"use client";

import React from "react";
import { Check } from "lucide-react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { CheckoutButton } from "@clerk/nextjs/experimental";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function PricingSection({ subscriptionTier = "free" }) {
  const { isSignedIn, isLoaded } = useUser();

  const isPro = subscriptionTier === "pro";

  const freeFeatures = [
    "10 pantry scans per month",
    "5 AI meal recommendations",
    "Standard support",
    "Standard Recipes",
  ];

  const proFeatures = [
    "Unlimited pantry scans",
    "Unlimited AI recipes",
    "Priority Support",
    "Recipes with Nutritional analysis",
    "Chef's Tips & Tricks",
    "Ingredient Substitutions",
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="mb-16">
        <h2 className="text-5xl md:text-6xl font-bold mb-4">
          Simple Pricing
        </h2>

        <p className="text-xl text-stone-600 font-light">
          Start for free. Upgrade to become a master chef.
        </p>
      </div>

      {/* PLANS */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

        {/* ================= FREE PLAN ================= */}
        <Card className="border-2 border-stone-200 bg-white">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              Sous Chef
            </CardTitle>

            <div className="text-5xl font-bold text-stone-900">
              $0
              <span className="text-lg font-normal text-stone-400">
                /mo
              </span>
            </div>

            <CardDescription className="text-stone-600 font-light text-base">
              Perfect for casual weekly cooks.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ul className="space-y-4">
              {freeFeatures.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-stone-700"
                >
                  <Check className="h-5 w-5 shrink-0 mt-0.5 text-stone-400" />

                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter className="mt-auto">
            <Link href="/dashboard" className="w-full">
              <Button
                variant="outline"
                className="w-full border-2 border-stone-900 hover:bg-stone-900 hover:text-white"
              >
                Get Started
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* ================= PRO PLAN ================= */}
        <Card className="relative border-2 border-orange-600 bg-orange-50">

          {/* MOST POPULAR */}
          <Badge
            className="
              absolute
              top-0
              right-0
              rounded-none
              rounded-bl-lg
              bg-orange-600
              text-white
              font-bold
              uppercase
              tracking-wide
              border-none
            "
          >
            MOST POPULAR
          </Badge>

          <CardHeader>
            <CardTitle className="text-3xl font-bold text-orange-900">
              Head Chef
            </CardTitle>

            <div className="text-5xl font-bold text-orange-600">
              $7.99
              <span className="text-lg font-normal text-orange-400">
                /mo
              </span>
            </div>

            <CardDescription className="text-orange-800/70 font-light text-base">
              For the serious home cook.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ul className="space-y-4">
              {proFeatures.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-orange-950"
                >
                  <Badge
                    className="
                      bg-orange-200
                      p-1
                      rounded-full
                      h-6
                      w-6
                      flex
                      items-center
                      justify-center
                      border-none
                    "
                  >
                    <Check className="h-4 w-4 text-orange-700" />
                  </Badge>

                  <span className="font-medium">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter>
            {!isLoaded ? (
              <Button
                disabled
                className="w-full bg-orange-300 text-white"
              >
                Loading...
              </Button>
            ) : isSignedIn ? (
              isPro ? (
                <Button
                  disabled
                  className="
                    w-full
                    bg-orange-400
                    text-white
                    cursor-not-allowed
                  "
                >
                  Subscribed
                </Button>
              ) : (
                <CheckoutButton
                  planId="cplan_3HxRi0xniXLyYvfXjFHc0H54gSK"
                  planPeriod="month"
                  newSubscriptionRedirectUrl="/dashboard"
                  checkoutProps={{
                    appearance: {
                      elements: {
                        drawerRoot: {
                          zIndex: 2000,
                        },
                      },
                    },
                  }}
                >
                  <button
                    type="button"
                    className="
                      w-full
                      h-10
                      rounded-md
                      bg-orange-600
                      hover:bg-orange-700
                      text-white
                      font-medium
                      transition-colors
                    "
                  >
                    Subscribe Now
                  </button>
                </CheckoutButton>
              )
            ) : (
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="
                    w-full
                    h-10
                    rounded-md
                    bg-orange-600
                    hover:bg-orange-700
                    text-white
                    font-medium
                    transition-colors
                  "
                >
                  Login to Subscribe
                </button>
              </SignInButton>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}