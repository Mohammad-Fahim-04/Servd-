"use server";

import { checkUser } from "@/lib/checkUser";
import { GoogleGenAI } from "@google/genai";
import {
  freeMealRecommendations,
  proTierLimit,
} from "@/lib/arcjet";
import { request } from "@arcjet/next";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is missing");
}

const genAI = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

// IMPORTANT:
// gemini-2.5-flash is giving 404 for your API key.
// Use a currently available model.
const GEMINI_MODEL = "gemini-3.6-flash";

// -----------------------------
// Helpers
// -----------------------------

function normalizeTitle(title) {
  return String(title || "")
    .trim()
    .split(/\s+/)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(" ");
}

function normalizeCuisine(value) {
  const cuisine = String(value || "")
    .toLowerCase()
    .trim();

  const map = {
    italian: "italian",
    chinese: "chinese",
    mexican: "mexican",
    indian: "indian",
    american: "american",
    thai: "thai",
    japanese: "japanese",
    mediterranean: "mediterranean",
    french: "french",
    korean: "korean",
    vietnamese: "vietnamese",
    spanish: "spanish",
    greek: "greek",
    turkish: "turkish",
    moroccan: "moroccan",
    brazilian: "brazilian",
    caribbean: "caribbean",
    "middle-eastern": "middle - eastern",
    "middle eastern": "middle - eastern",
    "middle - eastern": "middle - eastern",
    british: "british",
    german: "german",
    portuguese: "portuguese",
    other: "other",
  };

  return map[cuisine] || "other";
}

function normalizeCategory(value) {
  const categories = [
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "dessert",
  ];

  const category = String(value || "")
    .toLowerCase()
    .trim();

  return categories.includes(category) ? category : "dinner";
}

function cleanGeminiJSON(text) {
  return String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

async function fetchRecipeImage(recipeName) {
  try {
    if (!UNSPLASH_ACCESS_KEY) return "";

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        recipeName
      )}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return "";

    const data = await response.json();

    return data?.results?.[0]?.urls?.regular || "";
  } catch (error) {
    console.error("Unsplash error:", error);
    return "";
  }
}

// -----------------------------
// Gemini helper
// -----------------------------

async function generateGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const result = await genAI.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  return result.text || "";
}

// -----------------------------
// Generate / Get Recipe
// -----------------------------

export async function getOrGenerateRecipe(formData) {
  try {
    console.log("🚀 getOrGenerateRecipe started");

    const user = await checkUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const recipeName = formData.get("recipeName");

    if (!recipeName) {
      throw new Error("Recipe name is required");
    }

    const normalizedTitle = normalizeTitle(recipeName);
    const isPro = user.subscriptionTier === "pro";

    console.log("🔍 Searching:", normalizedTitle);

    // -----------------------------
    // 1. Search Strapi
    // -----------------------------

    const searchResponse = await fetch(
      `${STRAPI_URL}/api/recipes?filters[title][$eqi]=${encodeURIComponent(
        normalizedTitle
      )}&populate=*`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();

      if (searchData?.data?.length > 0) {
        const recipe = searchData.data[0];

        const savedResponse = await fetch(
          `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&filters[recipe][id][$eq]=${recipe.id}`,
          {
            headers: {
              Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            },
            cache: "no-store",
          }
        );

        let isSaved = false;

        if (savedResponse.ok) {
          const savedData = await savedResponse.json();
          isSaved = savedData?.data?.length > 0;
        }

        return {
          success: true,
          recipe,
          recipeId: recipe.id,
          isSaved,
          fromDatabase: true,
          isPro,
          message: "Recipe loaded from database",
        };
      }
    }

    // -----------------------------
    // 2. Gemini
    // -----------------------------

    console.log("🤖 Generating recipe with Gemini...");

    const prompt = `
You are a professional chef and recipe expert.

Generate a detailed recipe for "${normalizedTitle}".

Return ONLY valid JSON.

{
  "title": "${normalizedTitle}",
  "description": "Brief description",
  "category": "breakfast|lunch|dinner|snack|dessert",
  "cuisine": "italian|chinese|mexican|indian|american|thai|japanese|mediterranean|french|korean|vietnamese|spanish|greek|turkish|moroccan|brazilian|caribbean|middle-eastern|british|german|portuguese|other",
  "prepTime": 20,
  "cookTime": 30,
  "servings": 4,
  "ingredients": [
    {
      "item": "ingredient",
      "amount": "quantity",
      "category": "Protein|Vegetable|Spice|Dairy|Grain|Other"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "title": "Step title",
      "instruction": "Detailed instruction",
      "tip": "Optional tip"
    }
  ],
  "nutrition": {
    "calories": "300",
    "protein": "15g",
    "carbs": "30g",
    "fat": "10g"
  },
  "tips": [
    "Cooking tip"
  ],
  "substitutions": [
    {
      "original": "ingredient",
      "alternatives": ["alternative"]
    }
  ]
}

Rules:

- title must be exactly "${normalizedTitle}"
- category must be one allowed category
- cuisine must be one allowed cuisine
- 6-10 instruction steps
- realistic ingredients
- beginner friendly
- realistic cooking times
- Return ONLY JSON.
`;

    const text = await generateGemini(prompt);

    let recipeData;

    try {
      recipeData = JSON.parse(cleanGeminiJSON(text));
    } catch (error) {
      console.error("Gemini JSON error:", text);
      throw new Error("Gemini returned invalid recipe data");
    }

    // -----------------------------
    // 3. Normalize
    // -----------------------------

    const category = normalizeCategory(recipeData.category);
    const cuisine = normalizeCuisine(recipeData.cuisine);

    recipeData.title = normalizedTitle;
    recipeData.category = category;
    recipeData.cuisine = cuisine;

    recipeData.ingredients = Array.isArray(
      recipeData.ingredients
    )
      ? recipeData.ingredients
      : [];

    recipeData.instructions = Array.isArray(
      recipeData.instructions
    )
      ? recipeData.instructions
      : [];

    recipeData.tips = Array.isArray(recipeData.tips)
      ? recipeData.tips
      : [];

    recipeData.substitutions = Array.isArray(
      recipeData.substitutions
    )
      ? recipeData.substitutions
      : [];

    // -----------------------------
    // 4. Unsplash
    // -----------------------------

    console.log("🖼️ Fetching recipe image...");

    const imageUrl =
      await fetchRecipeImage(normalizedTitle);

    // -----------------------------
    // 5. Save to Strapi
    // -----------------------------

    const strapiRecipeData = {
      data: {
        title: normalizedTitle,
        description: recipeData.description || "",
        cuisine,
        category,
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        prepTime: Number(recipeData.prepTime) || 0,
        cookTime: Number(recipeData.cookTime) || 0,
        servings: Number(recipeData.servings) || 1,
        nutrition: recipeData.nutrition || {},
        tips: recipeData.tips,
        substitutions: recipeData.substitutions,
        imageUrl: imageUrl || "",
        isPublic: true,
        author: user.id,
      },
    };

    console.log("📤 Saving recipe...");
    console.log("Cuisine:", cuisine);

    const createResponse = await fetch(
      `${STRAPI_URL}/api/recipes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify(strapiRecipeData),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();

      console.error(
        "❌ Strapi save failed:",
        errorText
      );

      throw new Error(
        `Strapi save failed (${createResponse.status}): ${errorText}`
      );
    }

    const createdRecipe =
      await createResponse.json();

    console.log(
      "✅ Recipe saved:",
      createdRecipe?.data?.id
    );

    return {
      success: true,
      recipe: {
        ...recipeData,
        title: normalizedTitle,
        category,
        cuisine,
        imageUrl: imageUrl || "",
      },
      recipeId: createdRecipe?.data?.id,
      isSaved: false,
      fromDatabase: false,
      recommendationsLimit: isPro
        ? "unlimited"
        : 5,
      isPro,
      message:
        "Recipe generated and saved successfully!",
    };
  } catch (error) {
    console.error(
      "❌ getOrGenerateRecipe:",
      error
    );

    throw new Error(
      error?.message || "Failed to load recipe"
    );
  }
}

// -----------------------------
// Save Recipe
// -----------------------------

export async function saveRecipeToCollection(
  formData
) {
  try {
    const user = await checkUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const recipeId = formData.get("recipeId");

    if (!recipeId) {
      throw new Error("Recipe ID is required");
    }

    const existingResponse = await fetch(
      `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&filters[recipe][id][$eq]=${recipeId}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (existingResponse.ok) {
      const data =
        await existingResponse.json();

      if (data?.data?.length > 0) {
        return {
          success: true,
          alreadySaved: true,
          message: "Recipe is already saved",
        };
      }
    }

    const response = await fetch(
      `${STRAPI_URL}/api/saved-recipes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            user: user.id,
            recipe: recipeId,
            savedAt: new Date().toISOString(),
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        `Failed to save recipe: ${errorText}`
      );
    }

    const savedRecipe =
      await response.json();

    return {
      success: true,
      alreadySaved: false,
      savedRecipe: savedRecipe.data,
      message:
        "Recipe saved to your collection!",
    };
  } catch (error) {
    console.error(
      "Save recipe error:",
      error
    );

    throw new Error(
      error?.message || "Failed to save recipe"
    );
  }
}

// -----------------------------
// Remove Recipe
// -----------------------------

export async function removeRecipeFromCollection(
  formData
) {
  try {
    const user = await checkUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const recipeId = formData.get("recipeId");

    if (!recipeId) {
      throw new Error("Recipe ID is required");
    }

    const response = await fetch(
      `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&filters[recipe][id][$eq]=${recipeId}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        "Failed to find saved recipe"
      );
    }

    const data = await response.json();

    if (!data?.data?.length) {
      return {
        success: true,
        message: "Recipe was not saved",
      };
    }

    const savedId = data.data[0].id;

    const deleteResponse = await fetch(
      `${STRAPI_URL}/api/saved-recipes/${savedId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );

    if (!deleteResponse.ok) {
      throw new Error(
        "Failed to remove recipe"
      );
    }

    return {
      success: true,
      message:
        "Recipe removed from your collection",
    };
  } catch (error) {
    console.error(
      "Remove recipe error:",
      error
    );

    throw new Error(
      error?.message ||
        "Failed to remove recipe"
    );
  }
}

// -----------------------------
// Pantry Recommendations
// -----------------------------

export async function getRecipesByPantryIngredients() {
  try {
    const user = await checkUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const isPro =
      user.subscriptionTier === "pro";

    const arcjetClient = isPro
      ? proTierLimit
      : freeMealRecommendations;

    const req = await request();

    const decision =
      await arcjetClient.protect(req, {
        userId: user.clerkId,
        requested: 1,
      });

    if (decision.isDenied()) {
      throw new Error(
        isPro
          ? "Monthly AI recipe limit reached."
          : "Monthly AI recipe limit reached. Upgrade to Pro!"
      );
    }

    const pantryResponse = await fetch(
      `${STRAPI_URL}/api/pantry-items?filters[owner][id][$eq]=${user.id}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!pantryResponse.ok) {
      throw new Error(
        "Failed to fetch pantry items"
      );
    }

    const pantryData =
      await pantryResponse.json();

    if (!pantryData?.data?.length) {
      return {
        success: false,
        message:
          "Your pantry is empty. Add ingredients first!",
      };
    }

    const ingredients = pantryData.data
      .map((item) => item.name)
      .filter(Boolean)
      .join(", ");

    const prompt = `
You are a professional chef.

Available ingredients:
${ingredients}

Suggest 5 realistic recipes.

Return ONLY valid JSON array:

[
  {
    "title": "Recipe name",
    "description": "Short description",
    "matchPercentage": 85,
    "missingIngredients": ["ingredient"],
    "category": "breakfast|lunch|dinner|snack|dessert",
    "cuisine": "indian",
    "prepTime": 20,
    "cookTime": 30,
    "servings": 4
  }
]

Rules:

- matchPercentage must be 70-100
- prioritize available ingredients
- recipes should be realistic
- Return ONLY JSON.
`;

    const text =
      await generateGemini(prompt);

    let recipeSuggestions;

    try {
      recipeSuggestions = JSON.parse(
        cleanGeminiJSON(text)
      );
    } catch (error) {
      console.error(
        "Pantry Gemini JSON error:",
        text
      );

      throw new Error(
        "Gemini returned invalid recommendation data"
      );
    }

    return {
      success: true,
      recipes: recipeSuggestions,
      ingredientsUsed: ingredients,
      recommendationsLimit: isPro
        ? "unlimited"
        : 5,
      message: `Found ${recipeSuggestions.length} recipes you can make!`,
    };
  } catch (error) {
    console.error(
      "❌ getRecipesByPantryIngredients:",
      error
    );

    throw new Error(
      error?.message ||
        "Failed to get recipe suggestions"
    );
  }
}

// -----------------------------
// Saved Recipes
// -----------------------------

export async function getSavedRecipes() {
  try {
    const user = await checkUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(
      `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&populate[recipe][populate]=*&sort=savedAt:desc`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        `Failed to fetch saved recipes: ${errorText}`
      );
    }

    const data = await response.json();

    const recipes = (data?.data || [])
      .map(
        (savedRecipe) =>
          savedRecipe.recipe
      )
      .filter(Boolean);

    return {
      success: true,
      recipes,
      count: recipes.length,
    };
  } catch (error) {
    console.error(
      "Get saved recipes error:",
      error
    );

    throw new Error(
      error?.message ||
        "Failed to load saved recipes"
    );
  }
}