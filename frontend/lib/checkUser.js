import { auth, currentUser } from "@clerk/nextjs/server";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export const checkUser = async () => {
  try {
    // ==========================================
    // 1. GET CURRENT CLERK USER
    // ==========================================

    const user = await currentUser();

    if (!user) {
      console.log("❌ No Clerk user found");
      return null;
    }

    // ==========================================
    // 2. CHECK STRAPI TOKEN
    // ==========================================

    if (!STRAPI_API_TOKEN) {
      console.error("❌ STRAPI_API_TOKEN is missing");
      return null;
    }

    // ==========================================
    // 3. GET USER EMAIL
    // ==========================================

    const email = user.emailAddresses?.[0]?.emailAddress;

    if (!email) {
      console.error("❌ Clerk user email not found");
      return null;
    }

    // ==========================================
    // 4. GET CLERK SUBSCRIPTION
    // ==========================================

    const { has } = await auth();

    const subscriptionTier = has({ plan: "pro" })
      ? "pro"
      : "free";

    console.log("👤 Clerk User:", user.id);
    console.log("💳 Subscription:", subscriptionTier);

    // ==========================================
    // COMMON STRAPI HEADERS
    // ==========================================

    const headers = {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    };

    // ==========================================
    // 5. FIND USER BY CLERK ID
    // ==========================================

    const clerkResponse = await fetch(
      `${STRAPI_URL}/api/users?filters[clerkId][$eq]=${encodeURIComponent(
        user.id
      )}`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!clerkResponse.ok) {
      const errorText = await clerkResponse.text();

      console.error(
        "❌ Failed to find user by Clerk ID:",
        errorText
      );

      return null;
    }

    const clerkData = await clerkResponse.json();

    // ==========================================
    // 6. USER FOUND BY CLERK ID
    // ==========================================

    if (Array.isArray(clerkData) && clerkData.length > 0) {
      const existingUser = clerkData[0];

      // Update subscription if changed
      if (existingUser.subscriptionTier !== subscriptionTier) {
        const updateResponse = await fetch(
          `${STRAPI_URL}/api/users/${existingUser.id}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({
              subscriptionTier,
            }),
            cache: "no-store",
          }
        );

        if (!updateResponse.ok) {
          console.error(
            "⚠️ Failed to update subscription tier"
          );
        }
      }

      return {
        ...existingUser,
        subscriptionTier,
      };
    }

    // ==========================================
    // 7. FIND USER BY EMAIL
    // ==========================================

    const emailResponse = await fetch(
      `${STRAPI_URL}/api/users?filters[email][$eqi]=${encodeURIComponent(
        email
      )}`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();

      console.error(
        "❌ Failed to find user by email:",
        errorText
      );

      return null;
    }

    const emailData = await emailResponse.json();

    // ==========================================
    // 8. USER EXISTS WITH EMAIL
    // ==========================================

    if (Array.isArray(emailData) && emailData.length > 0) {
      const existingUser = emailData[0];

      const updateResponse = await fetch(
        `${STRAPI_URL}/api/users/${existingUser.id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            clerkId: user.id,
            firstName:
              user.firstName ||
              existingUser.firstName ||
              "",
            lastName:
              user.lastName ||
              existingUser.lastName ||
              "",
            imageUrl:
              user.imageUrl ||
              existingUser.imageUrl ||
              "",
            subscriptionTier,
          }),
          cache: "no-store",
        }
      );

      if (!updateResponse.ok) {
        console.error(
          "⚠️ Failed to link Clerk user with Strapi user"
        );

        return {
          ...existingUser,
          subscriptionTier,
        };
      }

      const updatedUser = await updateResponse.json();

      return {
        ...updatedUser,
        subscriptionTier,
      };
    }

    // ==========================================
    // 9. USER DOES NOT EXIST
    // CREATE NEW STRAPI USER
    // ==========================================

    const rolesResponse = await fetch(
      `${STRAPI_URL}/api/users-permissions/roles`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!rolesResponse.ok) {
      const errorText = await rolesResponse.text();

      console.error(
        "❌ Failed to fetch Strapi roles:",
        errorText
      );

      return null;
    }

    const rolesData = await rolesResponse.json();

    const authenticatedRole = rolesData.roles?.find(
      (role) => role.type === "authenticated"
    );

    if (!authenticatedRole) {
      console.error("❌ Authenticated Strapi role not found");
      return null;
    }

    // ==========================================
    // 10. GENERATE USERNAME
    // ==========================================

    const username =
      user.username ||
      `${email.split("@")[0]}_${user.id.slice(-6)}`;

    // ==========================================
    // 11. CREATE STRAPI USER DATA
    // ==========================================

    const userData = {
      username,
      email,

      // Clerk manages authentication.
      // This password is only required because
      // Strapi users-permissions requires a password.
      password: `clerk_managed_${user.id}_${Date.now()}`,

      confirmed: true,
      blocked: false,

      role: authenticatedRole.id,

      clerkId: user.id,

      firstName: user.firstName || "",
      lastName: user.lastName || "",
      imageUrl: user.imageUrl || "",

      subscriptionTier,
    };

    // ==========================================
    // 12. CREATE USER IN STRAPI
    // ==========================================

    const newUserResponse = await fetch(
      `${STRAPI_URL}/api/users`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(userData),
        cache: "no-store",
      }
    );

    if (!newUserResponse.ok) {
      const errorText = await newUserResponse.text();

      console.error(
        "❌ Error creating Strapi user:",
        errorText
      );

      return null;
    }

    const newUser = await newUserResponse.json();

    // ==========================================
    // 13. RETURN USER
    // ==========================================

    return {
      ...newUser,
      subscriptionTier,
    };
  } catch (error) {
    console.error(
      "❌ Error in checkUser:",
      error?.message || error
    );

    return null;
  }
};