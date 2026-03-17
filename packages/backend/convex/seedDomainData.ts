import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ─── Constants ───────────────────────────────────────────────────────────────

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

type Skill = "server" | "bartender" | "host" | "line_cook";

// ─── Staff skill assignments (deterministic, varied) ─────────────────────────
// Index 0-14 maps to the 15 staff members
const STAFF_SKILLS: Skill[][] = [
  ["server", "host"], // Emma Thorne
  ["bartender", "server"], // Liam Gallagher
  ["host", "line_cook"], // Olivia Carter
  ["server", "bartender", "host"], // Noah Brooks
  ["line_cook", "server"], // Ava Simmons
  ["bartender"], // Elijah Reed
  ["server", "host", "line_cook"], // Sophia Ward
  ["bartender", "server"], // James Bennett
  ["host"], // Isabella Foster
  ["server", "bartender"], // Benjamin Hayes
  ["line_cook", "host"], // Mia Sullivan
  ["bartender", "line_cook"], // Lucas Morales
  ["server"], // Charlotte Kim
  ["host", "bartender", "server"], // Mason Patel
  ["line_cook", "server", "host"], // Amelia Chen
];

// Availability patterns (deterministic, varied schedules)
const AVAILABILITY_PATTERNS: { days: number[]; start: string; end: string }[] =
  [
    { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" }, // Mon–Fri day
    { days: [1, 2, 3, 4, 5], start: "14:00", end: "22:00" }, // Mon–Fri evening
    { days: [0, 1, 2, 5, 6], start: "10:00", end: "18:00" }, // Sun/Mon/Tue/Fri/Sat
    { days: [2, 3, 4, 5, 6], start: "08:00", end: "16:00" }, // Tue–Sat morning
    { days: [1, 3, 5, 6], start: "11:00", end: "19:00" }, // Mon/Wed/Fri/Sat
    { days: [0, 1, 2, 3, 4], start: "07:00", end: "15:00" }, // Sun–Thu early
    { days: [1, 2, 3, 4, 5, 6], start: "10:00", end: "20:00" }, // Mon–Sat long
    { days: [0, 2, 4, 5, 6], start: "12:00", end: "20:00" }, // Sun/Tue/Thu–Sat
    { days: [1, 2, 3, 4], start: "09:00", end: "17:00" }, // Mon–Thu
    { days: [0, 1, 5, 6], start: "08:00", end: "16:00" }, // Weekends + Mon
    { days: [1, 2, 3, 4, 5], start: "16:00", end: "24:00" }, // Mon–Fri night
    { days: [3, 4, 5, 6], start: "10:00", end: "18:00" }, // Wed–Sat
    { days: [0, 1, 2, 3, 4, 5, 6], start: "09:00", end: "17:00" }, // Every day
    { days: [1, 2, 4, 5], start: "11:00", end: "19:00" }, // Mon/Tue/Thu/Fri
    { days: [0, 2, 3, 5, 6], start: "14:00", end: "22:00" }, // Sun/Tue/Wed/Fri/Sat
  ];

// Shift templates — varied times and skills for realistic scheduling
const SHIFT_TEMPLATES: { hourStart: number; hourEnd: number; skill: Skill }[] =
  [
    { hourStart: 7, hourEnd: 15, skill: "line_cook" }, // Morning kitchen
    { hourStart: 9, hourEnd: 17, skill: "server" }, // Day server
    { hourStart: 10, hourEnd: 18, skill: "host" }, // Day host
    { hourStart: 11, hourEnd: 19, skill: "server" }, // Lunch→evening server
    { hourStart: 14, hourEnd: 22, skill: "bartender" }, // Afternoon→close bar
    { hourStart: 16, hourEnd: 24, skill: "server" }, // Evening server
    { hourStart: 17, hourEnd: 1, skill: "bartender" }, // Evening bar (crosses midnight)
  ];

// ─── Main Seed Mutation ──────────────────────────────────────────────────────

export const seedDomainData = internalMutation({
  args: {
    authUsers: v.array(
      v.object({ id: v.string(), name: v.string(), role: v.string() }),
    ),
  },
  handler: async (ctx, args) => {
    // ▸ Guard: skip if already seeded
    const existingLocations = await ctx.db.query("locations").collect();
    if (existingLocations.length > 0) {
      console.log("Locations already seeded, skipping...");
      return "Database already seeded!";
    }

    // ─── 1. Create Locations ─────────────────────────────────────────────

    const locationIds: Id<"locations">[] = [];
    for (const loc of LOCATIONS) {
      const id = await ctx.db.insert("locations", loc);
      locationIds.push(id);
    }
    console.log(`✓ Created ${locationIds.length} locations`);

    const [dtManhattan, bkHeights, smPier, slLake] = locationIds;

    // ─── 2. Create User Profiles ─────────────────────────────────────────
    //
    // Order from seed.ts: [0] = admin, [1-6] = managers, [7-21] = staff

    const adminIds: Id<"userProfiles">[] = [];
    const managerIds: Id<"userProfiles">[] = [];
    const staffIds: Id<"userProfiles">[] = [];

    let staffIndex = 0;

    for (let i = 0; i < args.authUsers.length; i++) {
      const u = args.authUsers[i];
      const role = u.role as "admin" | "manager" | "staff";

      let homeTimezone: string;
      let skills: Skill[];
      let certifiedLocationIds: Id<"locations">[];

      if (role === "admin") {
        // Admin — no specific timezone bias, can see everything
        homeTimezone = "America/New_York";
        skills = [];
        certifiedLocationIds = [];
      } else if (role === "manager") {
        // Managers are assigned regionally:
        // Index in managers array: 0,1,2 = NY, 3,4,5 = LA
        const managerIndex = managerIds.length;
        const isNY = managerIndex < 3;
        homeTimezone = isNY ? "America/New_York" : "America/Los_Angeles";
        skills = []; // Managers don't need skills
        certifiedLocationIds = []; // Managers don't use certifiedLocationIds
      } else {
        // Staff — distribute across coasts
        // First 8 staff → NY, last 7 → LA
        const isEastCoast = staffIndex < 8;
        homeTimezone = isEastCoast ? "America/New_York" : "America/Los_Angeles";
        skills = STAFF_SKILLS[staffIndex] ?? ["server"];

        // Certify at local locations. Some are certified at both, some at one.
        if (isEastCoast) {
          certifiedLocationIds =
            staffIndex % 3 === 0
              ? [dtManhattan, bkHeights]
              : staffIndex % 3 === 1
                ? [dtManhattan]
                : [bkHeights];
        } else {
          const laIdx = staffIndex - 8;
          certifiedLocationIds =
            laIdx % 3 === 0
              ? [smPier, slLake]
              : laIdx % 3 === 1
                ? [smPier]
                : [slLake];
        }

        staffIndex++;
      }

      const profileId = await ctx.db.insert("userProfiles", {
        authUserId: u.id,
        name: u.name,
        role,
        homeTimezone,
        skills,
        certifiedLocationIds,
      });

      if (role === "admin") adminIds.push(profileId);
      else if (role === "manager") managerIds.push(profileId);
      else staffIds.push(profileId);
    }

    console.log(
      `✓ Created profiles: ${adminIds.length} admin, ${managerIds.length} managers, ${staffIds.length} staff`,
    );

    // ─── 3. Assign Managers to Locations ─────────────────────────────────
    //
    // Manager 0 (Victor Okafor)    → Downtown Manhattan
    // Manager 1 (Rachel Nguyen)    → Brooklyn Heights
    // Manager 2 (Marcus Webb)      → Downtown Manhattan + Brooklyn Heights
    // Manager 3 (Priya Dasgupta)   → Santa Monica Pier
    // Manager 4 (Carlos Rivera)    → Silver Lake
    // Manager 5 (Hannah Lee)       → Santa Monica Pier + Silver Lake

    const managerLocationAssignments: [number, Id<"locations">][] = [
      [0, dtManhattan],
      [1, bkHeights],
      [2, dtManhattan],
      [2, bkHeights],
      [3, smPier],
      [4, slLake],
      [5, smPier],
      [5, slLake],
    ];

    for (const [mgrIdx, locId] of managerLocationAssignments) {
      await ctx.db.insert("managerLocations", {
        managerId: managerIds[mgrIdx],
        locationId: locId,
      });
    }
    console.log(
      `✓ Created ${managerLocationAssignments.length} manager-location assignments`,
    );

    // ─── 4. Create Staff Availability ────────────────────────────────────

    for (let i = 0; i < staffIds.length; i++) {
      const pattern = AVAILABILITY_PATTERNS[i % AVAILABILITY_PATTERNS.length];
      for (const day of pattern.days) {
        await ctx.db.insert("availability", {
          staffId: staffIds[i],
          dayOfWeek: day,
          startTime: pattern.start,
          endTime: pattern.end,
        });
      }
    }
    console.log(`✓ Created availability for ${staffIds.length} staff members`);

    // ─── 5. Create Shifts for Current Week ───────────────────────────────

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setUTCHours(0, 0, 0, 0);
    startOfWeek.setUTCDate(now.getUTCDate() - now.getUTCDay()); // Sunday

    // Manager responsible for each location (use index 0 for first loc, etc.)
    const locationManagers: Id<"userProfiles">[] = [
      managerIds[0], // Downtown Manhattan → Victor
      managerIds[1], // Brooklyn Heights → Rachel
      managerIds[3], // Santa Monica Pier → Priya
      managerIds[4], // Silver Lake → Carlos
    ];

    const shiftIds: Id<"shifts">[] = [];
    let templateIndex = 0;

    for (let locIdx = 0; locIdx < locationIds.length; locIdx++) {
      const locId = locationIds[locIdx];
      const locTz = LOCATIONS[locIdx].timezone;
      const createdBy = locationManagers[locIdx];

      // Create 7 shifts per location (Mon–Sun, varied templates)
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const template =
          SHIFT_TEMPLATES[templateIndex % SHIFT_TEMPLATES.length];
        templateIndex++;

        const shiftDate = new Date(startOfWeek);
        shiftDate.setUTCDate(startOfWeek.getUTCDate() + dayOffset);

        // Convert local hours to UTC based on location timezone
        const utcOffset = locTz === "America/New_York" ? 5 : 8; // rough EST/PST
        const startHourUTC = (template.hourStart + utcOffset) % 24;
        let endHourUTC = (template.hourEnd + utcOffset) % 24;

        const shiftStart = new Date(shiftDate);
        shiftStart.setUTCHours(startHourUTC, 0, 0, 0);

        const shiftEnd = new Date(shiftDate);
        if (template.hourEnd <= template.hourStart) {
          // Crosses midnight
          shiftEnd.setUTCDate(shiftEnd.getUTCDate() + 1);
        }
        shiftEnd.setUTCHours(endHourUTC, 0, 0, 0);

        // Friday (5) and Saturday (6) evening shifts are premium
        const dayOfWeek = (startOfWeek.getUTCDay() + dayOffset) % 7;
        const isPremium =
          (dayOfWeek === 5 || dayOfWeek === 6) && template.hourStart >= 17;

        const status = dayOffset <= 4 ? "published" : "draft"; // Mon-Fri published, Sat-Sun draft

        const shiftId = await ctx.db.insert("shifts", {
          locationId: locId,
          startTime: shiftStart.getTime(),
          endTime: shiftEnd.getTime(),
          requiredSkill: template.skill,
          headcount: template.skill === "line_cook" ? 1 : 2,
          status,
          isPremium,
          createdBy,
        });

        shiftIds.push(shiftId);
      }
    }
    console.log(`✓ Created ${shiftIds.length} shifts across all locations`);

    // ─── 6. Create Assignments ───────────────────────────────────────────

    // Assign first NY staff to several Downtown Manhattan shifts (overtime scenario)
    const nyShifts = shiftIds.slice(0, 7); // First 7 = Downtown Manhattan
    const overtimeStaff = staffIds[0]; // Emma Thorne

    for (let i = 0; i < 5; i++) {
      await ctx.db.insert("assignments", {
        shiftId: nyShifts[i],
        staffId: overtimeStaff,
        assignedBy: managerIds[0], // Victor
        assignedAt: Date.now(),
      });
    }

    // Spread some assignments across other staff
    const bkShifts = shiftIds.slice(7, 14); // Brooklyn Heights shifts
    for (let i = 0; i < 4; i++) {
      await ctx.db.insert("assignments", {
        shiftId: bkShifts[i],
        staffId: staffIds[i + 1], // Liam, Olivia, Noah, Ava
        assignedBy: managerIds[1], // Rachel
        assignedAt: Date.now(),
      });
    }

    const smShifts = shiftIds.slice(14, 21); // Santa Monica shifts
    for (let i = 0; i < 3; i++) {
      await ctx.db.insert("assignments", {
        shiftId: smShifts[i],
        staffId: staffIds[8 + i], // Isabella, Benjamin, Mia (LA staff)
        assignedBy: managerIds[3], // Priya
        assignedAt: Date.now(),
      });
    }

    const slShifts = shiftIds.slice(21, 28); // Silver Lake shifts
    for (let i = 0; i < 3; i++) {
      await ctx.db.insert("assignments", {
        shiftId: slShifts[i],
        staffId: staffIds[11 + i], // Lucas, Charlotte, Mason (LA staff)
        assignedBy: managerIds[4], // Carlos
        assignedAt: Date.now(),
      });
    }

    console.log("✓ Created assignments (including overtime scenario for Emma)");

    // ─── 7. Create Swap Requests ─────────────────────────────────────────

    // Pending swap: Liam wants to swap his Brooklyn shift with Olivia
    await ctx.db.insert("swapRequests", {
      shiftId: bkShifts[0],
      requesterId: staffIds[1], // Liam
      targetId: staffIds[2], // Olivia
      status: "pending",
      createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    });

    // Accepted swap awaiting manager approval: Isabella → Mia at Santa Monica
    await ctx.db.insert("swapRequests", {
      shiftId: smShifts[1],
      requesterId: staffIds[8], // Isabella
      targetId: staffIds[10], // Mia
      status: "accepted",
      createdAt: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
    });

    console.log("✓ Created swap requests (1 pending, 1 accepted)");

    // ─── 8. Create Sample Notifications ──────────────────────────────────

    const sampleNotifications = [
      {
        userId: staffIds[0], // Emma
        type: "shift_assigned",
        message: "You have been assigned to a new shift at Downtown Manhattan.",
        isRead: false,
        createdAt: Date.now() - 1 * 60 * 60 * 1000,
      },
      {
        userId: staffIds[1], // Liam
        type: "swap_pending",
        message: "Your swap request to Olivia is pending.",
        isRead: false,
        createdAt: Date.now() - 2 * 60 * 60 * 1000,
      },
      {
        userId: staffIds[2], // Olivia
        type: "swap_received",
        message: "Liam Gallagher has requested a shift swap with you.",
        isRead: false,
        createdAt: Date.now() - 2 * 60 * 60 * 1000,
      },
      {
        userId: managerIds[1], // Rachel
        type: "swap_accepted",
        message:
          "Isabella Foster accepted a swap request and it needs your approval.",
        isRead: false,
        createdAt: Date.now() - 4 * 60 * 60 * 1000,
      },
      {
        userId: staffIds[8], // Isabella
        type: "shift_assigned",
        message: "You have been assigned to a shift at Santa Monica Pier.",
        isRead: true,
        createdAt: Date.now() - 24 * 60 * 60 * 1000,
      },
    ];

    for (const notif of sampleNotifications) {
      await ctx.db.insert("notifications", notif);
    }
    console.log(`✓ Created ${sampleNotifications.length} sample notifications`);

    return "Successfully seeded all data: locations, profiles, manager assignments, availability, shifts, assignments, swaps, and notifications!";
  },
});
