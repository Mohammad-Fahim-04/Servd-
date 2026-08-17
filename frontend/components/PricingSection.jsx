
"use client";

import React from "react";
import { Check } from "lucide-react";
import {
  useUser,
  SignInButton,
} from "@clerk/nextjs";
import {
  CheckoutButton,
  usePlans,
} from "@clerk/nextjs/experimental";

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

export default function PricingSection({
  subscriptionTier = "free",
}) {
  const { isSignedIn, isLoaded: userLoaded } = useUser();

  /*
   * Get all publicly available USER plans
   * directly from Clerk.
   *
   * We do NOT hardcode the cplan_ ID anymore.
   */
  const {
    data: plans,
    isLoading: plansLoading,
    isError: plansError,
  } = usePlans({
    for: "user",
    pageSize: 20,
  });

  const isPro = subscriptionTier === "pro";

  /*
   * Find the Clerk plan whose key/name is "pro".
   *
   * Your Clerk Dashboard screenshot shows:
   *
   * Name: Pro
   * Key:  pro
   */
  const proPlan = plans?.find(
    (plan) =>
      plan.name?.toLowerCase() === "pro" ||
      plan.slug?.toLowerCase() === "pro"
  );

  /*
   * Debug information.
   *
   * Open F12 -> Console and you will see
   * the COMPLETE plan ID that Clerk is returning.
   */
  React.useEffect(() => {
    if (plans) {
      console.log("========== CLERK BILLING PLANS ==========");

      plans.forEach((plan) => {
        console.log({
          name: plan.name,
          id: plan.id,
          slug: plan.slug,
          publiclyVisible: plan.publiclyVisible,
          isRecurring: plan.isRecurring,
          hasBaseFee: plan.hasBaseFee,
          amount: plan.amountFormatted,
          currency: plan.currency,
        });
      });

      console.log("========== SELECTED PRO PLAN ==========");
      console.log(proPlan);
      console.log("PRO PLAN ID:", proPlan?.id);
      console.log("========================================");
    }
  }, [plans, proPlan]);

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

  const isLoading = !userLoaded || plansLoading;

  return (
    <div className="max-w-6xl mx-auto">

      {/* ================= HEADER ================= */}

      <div className="mb-16">
        <h2 className="text-5xl md:text-6xl font-bold mb-4">
          Simple Pricing
        </h2>

        <p className="text-xl text-stone-600 font-light">
          Start for free. Upgrade to become a master chef.
        </p>
      </div>

      {/* ================= PLANS ================= */}

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
                  <Check
                    className="
                      h-5
                      w-5
                      shrink-0
                      mt-0.5
                      text-stone-400
                    "
                  />

                  <span>{item}</span>
                </li>
              ))}

            </ul>

          </CardContent>

          <CardFooter className="mt-auto">

            <Link
              href="/dashboard"
              className="w-full"
            >
              <Button
                variant="outline"
                className="
                  w-full
                  border-2
                  border-stone-900
                  hover:bg-stone-900
                  hover:text-white
                "
              >
                Get Started
              </Button>
            </Link>

          </CardFooter>

        </Card>

        {/* ================= PRO PLAN ================= */}

        <Card
          className="
            relative
            border-2
            border-orange-600
            bg-orange-50
          "
        >

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

            <CardTitle
              className="
                text-3xl
                font-bold
                text-orange-900
              "
            >
              Head Chef
            </CardTitle>

            <div
              className="
                text-5xl
                font-bold
                text-orange-600
              "
            >
              $7.99

              <span
                className="
                  text-lg
                  font-normal
                  text-orange-400
                "
              >
                /mo
              </span>
            </div>

            <CardDescription
              className="
                text-orange-800/70
                font-light
                text-base
              "
            >
              For the serious home cook.
            </CardDescription>

          </CardHeader>

          <CardContent>

            <ul className="space-y-4">

              {proFeatures.map((item) => (
                <li
                  key={item}
                  className="
                    flex
                    gap-3
                    text-orange-950
                  "
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
                    <Check
                      className="
                        h-4
                        w-4
                        text-orange-700
                      "
                    />
                  </Badge>

                  <span className="font-medium">
                    {item}
                  </span>

                </li>
              ))}

            </ul>

          </CardContent>

          <CardFooter>

            {/* ================= LOADING ================= */}

            {isLoading ? (

              <Button
                disabled
                className="
                  w-full
                  bg-orange-300
                  text-white
                "
              >
                Loading...
              </Button>

            ) : !isSignedIn ? (

              /* ================= NOT LOGGED IN ================= */

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

            ) : isPro ? (

              /* ================= ALREADY PRO ================= */

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

            ) : plansError ? (

              /* ================= CLERK ERROR ================= */

              <div className="w-full">

                <Button
                  disabled
                  className="
                    w-full
                    bg-red-500
                    text-white
                  "
                >
                  Unable to Load Plan
                </Button>

                <p className="text-xs text-red-600 mt-2 text-center">
                  Clerk Billing plans could not be loaded.
                </p>

              </div>

            ) : !proPlan ? (

              /* ================= PRO PLAN NOT FOUND ================= */

              <div className="w-full">

                <Button
                  disabled
                  className="
                    w-full
                    bg-red-500
                    text-white
                    cursor-not-allowed
                  "
                >
                  Pro Plan Not Found
                </Button>

                <p className="text-xs text-red-600 mt-2 text-center">
                  Clerk returned no public Pro plan.
                </p>

              </div>

            ) : (

              /* ================= CHECKOUT ================= */

              <CheckoutButton
                planId={proPlan.id}
                planPeriod="month"
                for="user"
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

            )}

          </CardFooter>

        </Card>

      </div>

    </div>
  );
}

