import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const LOCATIONS = [
  {
    name: "Downtown Manhattan",
    timezone: "America/New_York",
    address: "123 Broadway, New York, NY 10006",
  },
  {
    name: "Brooklyn Heights",
    timezone: "America/New_York",
    address: "45 Montague St, Brooklyn, NY 11201",
  },
  {
    name: "Santa Monica Pier",
    timezone: "America/Los_Angeles",
    address: "200 Santa Monica Pier, Santa Monica, CA 90401",
  },
  {
    name: "Silver Lake",
    timezone: "America/Los_Angeles",
    address: "3300 Sunset Blvd, Los Angeles, CA 90026",
  },
];

const SKILLS = ["server", "bartender", "host", "line_cook"] as const;

function randomElement<T>(arr: T[] | readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: T[] | readonly T[], maxItems: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * maxItems) + 1);
}

export const seedDomainData = internalMutation({
  args: {
    authUsers: v.array(v.object({ id: v.string(), name: v.string() })),
  },
  handler: async (ctx, args) => {
    // 1. Create Locations if they don't exist
    const existingLocations = await ctx.db.query("locations").collect();
    if (existingLocations.length > 0) {
      console.log("Locations already seeded, skipping...");
      return "Database already seeded!";
    }

    const locationIds = [];
    for (const loc of LOCATIONS) {
      const id = await ctx.db.insert("locations", loc);
      locationIds.push(id);
    }
    console.log(`Created ${locationIds.length} locations`);

    // Split locations into East/West for logical assignment
    const nyLocations = locationIds.slice(0, 2);
    const laLocations = locationIds.slice(2, 4);

    // 2. Create Staff members (15 total) using provided auth IDs
    const staffIds = [];
    for (let i = 0; i < args.authUsers.length; i++) {
      const authUser = args.authUsers[i];
      const isEastCoast = i < 8; // First 8 in NY, rest in LA
      const homeTz = isEastCoast ? "America/New_York" : "America/Los_Angeles";
      const certLocations = isEastCoast ? nyLocations : laLocations;

      const profileId = await ctx.db.insert("userProfiles", {
        authUserId: authUser.id,
        name: authUser.name,
        role: "staff",
        homeTimezone: homeTz,
        skills: randomSubset(SKILLS, 2),
        certifiedLocationIds: certLocations,
      });

      staffIds.push(profileId);

      // 3. Create generic availability for each staff member
      // Most staff available 4-5 days a week
      const daysAvailable = randomSubset([0, 1, 2, 3, 4, 5, 6], 5);
      for (const day of daysAvailable) {
        await ctx.db.insert("availability", {
          staffId: profileId,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
        });
      }
    }
    console.log(`Created ${staffIds.length} staff members and availability`);

    // 4. Create some shifts for the current week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setUTCHours(0, 0, 0, 0);
    startOfWeek.setUTCDate(now.getUTCDate() - now.getUTCDay()); // Sunday

    const shiftIds = [];
    for (const locId of locationIds) {
      // Create 5 shifts per location
      for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
        const shiftStart = new Date(startOfWeek);
        shiftStart.setUTCDate(startOfWeek.getUTCDate() + dayOffset);
        shiftStart.setUTCHours(14, 0, 0, 0); // 14:00 UTC = 10:00 AM ET

        const shiftEnd = new Date(shiftStart);
        shiftEnd.setUTCHours(22, 0, 0, 0); // 8-hour shift

        const isPremium = dayOffset === 5; // Friday is premium

        const shiftId = await ctx.db.insert("shifts", {
          locationId: locId,
          startTime: shiftStart.getTime(),
          endTime: shiftEnd.getTime(),
          requiredSkill: randomElement(SKILLS),
          headcount: 2,
          status: "published",
          isPremium,
          createdBy: staffIds[0], // using first staff as dummy creator
        });

        shiftIds.push(shiftId);
      }
    }
    console.log(`Created ${shiftIds.length} shifts`);

    // 5. Create assignments
    // Create an assignment that triggers overtime warning (many shifts for one person)
    const overtimeStaffId = staffIds[0]; // Let's use the first NY staff
    for (let i = 0; i < 6; i++) {
      // Assign 6 shifts (48 hours)
      await ctx.db.insert("assignments", {
        shiftId: shiftIds[i % shiftIds.length],
        staffId: overtimeStaffId,
        assignedBy: staffIds[1], // another dummy staff as manager
        assignedAt: Date.now(),
      });
    }
    console.log("Created assignments (including overtime scenario)");

    // 6. Create a pending swap request
    await ctx.db.insert("swapRequests", {
      shiftId: shiftIds[0],
      requesterId: staffIds[2], // requester
      targetId: staffIds[3], // target
      status: "pending",
      createdAt: Date.now(),
    });
    console.log("Created pending swap request");

    return "Successfully seeded locations, staff, availability, shifts, assignments, and swap requests!";
  },
});
