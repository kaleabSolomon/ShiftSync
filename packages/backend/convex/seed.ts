"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { createAuth } from "./auth";

const STAFF_NAMES = [
  "Emma Thorne",
  "Liam Gallagher",
  "Olivia Carter",
  "Noah Brooks",
  "Ava Simmons",
  "Elijah Reed",
  "Sophia Ward",
  "James Bennett",
  "Isabella Foster",
  "Benjamin Hayes",
  "Mia Sullivan",
  "Lucas Morales",
  "Charlotte Kim",
  "Mason Patel",
  "Amelia Chen",
];

// The main entry point: an action that can run Node APIs
export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    const auth = createAuth(ctx);

    console.log("Creating 15 Better Auth users...");
    const authUsers = [];

    for (const name of STAFF_NAMES) {
      const firstName = name.split(" ")[0].toLowerCase();
      const email = `${firstName}@shiftsync.local`;
      const password = "password123";

      // Create real Better Auth user
      const response = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
      });

      if (!response.user) {
        console.error(`Failed to create user ${email}`);
        continue;
      }

      console.log(`Created user: ${email} / ${password}`);
      authUsers.push({ id: response.user.id, name: response.user.name });
    }

    console.log("Calling internal mutation to seed domain data...");
    // Call the internal mutation to seed the rest of the database
    await ctx.runMutation(internal.seedDomainData.seedDomainData, {
      authUsers,
    });

    return "Seed complete";
  },
});
