"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { createAuth } from "./auth";

// ─── 22 Users: 1 Admin, 6 Managers, 15 Staff ─────────────────────────────────

interface SeedUser {
  name: string;
  role: "admin" | "manager" | "staff";
}

const SEED_USERS: SeedUser[] = [
  // ── Admin (1) ──
  { name: "Diana Reyes", role: "admin" },

  // ── Managers (6) — 3 for NY locations, 3 for LA locations ──
  { name: "Victor Okafor", role: "manager" }, // Downtown Manhattan
  { name: "Rachel Nguyen", role: "manager" }, // Brooklyn Heights
  { name: "Marcus Webb", role: "manager" }, // Both NY locations
  { name: "Priya Dasgupta", role: "manager" }, // Santa Monica Pier
  { name: "Carlos Rivera", role: "manager" }, // Silver Lake
  { name: "Hannah Lee", role: "manager" }, // Both LA locations

  // ── Staff (15) ──
  { name: "Emma Thorne", role: "staff" },
  { name: "Liam Gallagher", role: "staff" },
  { name: "Olivia Carter", role: "staff" },
  { name: "Noah Brooks", role: "staff" },
  { name: "Ava Simmons", role: "staff" },
  { name: "Elijah Reed", role: "staff" },
  { name: "Sophia Ward", role: "staff" },
  { name: "James Bennett", role: "staff" },
  { name: "Isabella Foster", role: "staff" },
  { name: "Benjamin Hayes", role: "staff" },
  { name: "Mia Sullivan", role: "staff" },
  { name: "Lucas Morales", role: "staff" },
  { name: "Charlotte Kim", role: "staff" },
  { name: "Mason Patel", role: "staff" },
  { name: "Amelia Chen", role: "staff" },
];

// The main entry point: an action that can run Node APIs
export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    const auth = createAuth(ctx);

    console.log(`Creating ${SEED_USERS.length} Better Auth users...`);
    const authUsers: { id: string; name: string; role: string }[] = [];

    for (const user of SEED_USERS) {
      const firstName = user.name.split(" ")[0].toLowerCase();
      const email = `${firstName}@shiftsync.local`;
      const password = "password123";

      // Create real Better Auth user
      const response = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: user.name,
        },
      });

      if (!response.user) {
        console.error(`Failed to create user ${email}`);
        continue;
      }

      console.log(`Created user: ${email} / ${password} (${user.role})`);
      authUsers.push({
        id: response.user.id,
        name: response.user.name,
        role: user.role,
      });
    }

    console.log("Calling internal mutation to seed domain data...");
    await ctx.runMutation(internal.seedDomainData.seedDomainData, {
      authUsers,
    });

    return "Seed complete";
  },
});
