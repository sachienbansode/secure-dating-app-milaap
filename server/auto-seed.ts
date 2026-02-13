import { db } from "./db";
import { users, profiles } from "@shared/schema";
import { encrypt } from "./encryption";
import { sql } from "drizzle-orm";

const maleNames = ["Aarav", "Vihaan", "Aditya", "Arjun", "Rohan"];
const femaleNames = ["Priya", "Ananya", "Diya", "Kiara", "Sneha"];
const transNames = ["Kiran", "Noor", "Shakti", "Alex", "Jordan"];
const coupleNames = ["Aarav & Priya", "Rohan & Sneha", "Vikram & Anjali", "Arjun & Diya", "Kabir & Meera"];

const malePhotos = [
  "/profiles/indian_male_seed_1.png",
  "/profiles/indian_male_seed_2.png",
  "/profiles/indian_male_seed_3.png",
  "/profiles/indian_male_seed_4.png",
  "/profiles/indian_male_seed_5.png",
];

const femalePhotos = [
  "/profiles/indian_female_seed_1.png",
  "/profiles/indian_female_seed_2.png",
  "/profiles/indian_female_seed_3.png",
  "/profiles/indian_female_seed_4.png",
  "/profiles/indian_female_seed_5.png",
];

const neutralPhotos = [
  "/profiles/indian_neutral_seed_1.png",
  "/profiles/indian_neutral_seed_2.png",
  "/profiles/indian_neutral_seed_3.png",
  "/profiles/indian_neutral_seed_4.png",
  "/profiles/indian_neutral_seed_5.png",
];

const couplePhotos = [
  "/profiles/indian_couple_seed_1.png",
  "/profiles/indian_couple_seed_2.png",
  "/profiles/indian_couple_seed_3.png",
  "/profiles/indian_couple_seed_4.png",
  "/profiles/indian_couple_seed_5.png",
];

const locations = [
  { loc: "Bandra West, Mumbai", city: "Mumbai" },
  { loc: "Koregaon Park, Pune", city: "Pune" },
  { loc: "Indiranagar, Bangalore", city: "Bangalore" },
  { loc: "Hauz Khas, Delhi", city: "Delhi" },
  { loc: "Jubilee Hills, Hyderabad", city: "Hyderabad" },
];

const bios = [
  "Lover of chai and good conversations.",
  "Adventure seeker and travel enthusiast.",
  "Tech geek who loves cricket.",
  "Bollywood buff looking for a movie partner.",
  "Foodie exploring the best street food spots.",
];

const coupleBios = [
  "Fun-loving couple looking to connect with like-minded pairs!",
  "Together 3 years and counting. Looking for double date partners!",
  "Adventure couple - hiking, road trips, and new experiences!",
  "We bonded over chai and cricket. Want to meet similar couples!",
  "Foodies who love trying new restaurants together.",
];

const interestsList = ["Bollywood", "Cricket", "Chai", "Street Food", "Yoga", "Tech", "Art", "Music", "Travel", "Reading"];
const festivals = ["Diwali", "Holi", "Navratri", "Eid", "Christmas"];
const intents = ["Casual", "Dating", "Serious", "Marriage"];

const getRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomSubset = <T,>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const SEED_PHONE_BASE = 9900000000;

export async function autoSeedProfiles() {
  const seedUsers = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`phone LIKE '+91990000%'`);
  const seedCount = Number(seedUsers[0].count);
  if (seedCount >= 20) {
    console.log(`Auto-seed: ${seedCount} seed profiles already exist, skipping seed profiles.`);
    await seedFounderProfiles();
    return;
  }
  if (seedCount > 0) {
    console.log(`Auto-seed: Found ${seedCount} incomplete seed profiles, cleaning up...`);
    await db.delete(profiles).where(sql`user_id IN (SELECT id FROM users WHERE phone LIKE '+91990000%')`);
    await db.delete(users).where(sql`phone LIKE '+91990000%'`);
  }

  console.log("Auto-seed: Seed profiles missing, creating 20 seed profiles (5 per category)...");

  let phoneCounter = 0;

  await db.transaction(async (tx) => {
    const createProfiles = async (
      names: string[],
      gender: "Male" | "Female" | "Trans" | "Couple",
      photoPool: string[],
      bioPool: string[],
    ) => {
      for (let i = 0; i < 5; i++) {
        const name = names[i];
        const locationData = locations[i];
        const age = 22 + Math.floor(Math.random() * 10);
        const respectScore = 75 + Math.floor(Math.random() * 25);
        const bio = bioPool[i];
        const interests = getRandomSubset(interestsList, 3 + Math.floor(Math.random() * 3));
        const photo = photoPool[i];
        const intent = getRandom(intents);
        const festivalPrefs = getRandomSubset(festivals, 2 + Math.floor(Math.random() * 2));

        let partner1Name = name;
        let partner2Name: string | undefined;
        let partner2Age: number | undefined;
        let partner2Gender: string | undefined;

        if (gender === "Couple" && name.includes(" & ")) {
          const parts = name.split(" & ");
          partner1Name = parts[0];
          partner2Name = parts[1];
          partner2Age = 22 + Math.floor(Math.random() * 10);
          partner2Gender = getRandom(["Male", "Female"]);
        }

        const membershipTier = getRandom(["basic", "silver", "gold", "platinum"]);
        const membershipExpiresAt = membershipTier !== "basic" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined;

        phoneCounter++;
        const phone = `+91${SEED_PHONE_BASE + phoneCounter}`;

        const [user] = await tx
          .insert(users)
          .values({
            phone,
            isVerified: true,
            respectScore,
            membershipTier,
            ...(membershipExpiresAt && { membershipExpiresAt }),
          })
          .returning();

        await tx.insert(profiles).values({
          userId: user.id,
          name: encrypt(partner1Name),
          age,
          gender,
          bio: encrypt(bio),
          city: locationData.city,
          location: locationData.loc,
          interests,
          photos: [photo],
          isVisible: true,
          aiPersonaEnabled: Math.random() > 0.5,
          aiTone: getRandom(["Friendly", "Witty", "Polite", "Flirty"]),
          aiLanguage: getRandom(["English", "Hindi", "Hinglish"]),
          aiProxyEnabled: false,
          aiChatPace: getRandom(["Slow", "Normal", "Fast"]),
          intent,
          intentLockedAt: new Date(),
          familyMode: false,
          festivalPrefs,
          hometownForFestivals: locationData.city,
          interestedIn: gender === "Couple" ? ["Couple", "Female"] : undefined,
          dateReadiness: getRandom(["Chat-only", "Voice-ready", "Meet-ready"]),
          ...(partner2Name && {
            partner2Name: encrypt(partner2Name),
            partner2Age,
            partner2Gender,
          }),
        });
      }
    };

    await createProfiles(maleNames, "Male", malePhotos, bios);
    console.log("Auto-seed: Created 5 male profiles");

    await createProfiles(femaleNames, "Female", femalePhotos, bios);
    console.log("Auto-seed: Created 5 female profiles");

    await createProfiles(transNames, "Trans", neutralPhotos, bios);
    console.log("Auto-seed: Created 5 trans profiles");

    await createProfiles(coupleNames, "Couple", couplePhotos, coupleBios);
    console.log("Auto-seed: Created 5 couple profiles");

    await seedFounderProfiles(tx);
    console.log("Auto-seed: Created founder profiles (Ithan & Rekha)");
  });

  console.log("Auto-seed: Complete! 22 profiles created (20 seed + 2 founders).");
}

async function seedFounderProfiles(dbOrTx: any = db) {
  const existingIthan = await dbOrTx.select({ id: users.id }).from(users).where(sql`phone = '+919820098200'`);
  if (existingIthan.length === 0) {
    const [ithanUser] = await dbOrTx
      .insert(users)
      .values({
        phone: "+919820098200",
        isVerified: true,
        respectScore: 67,
        membershipTier: "platinum",
        membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      })
      .returning();

    await dbOrTx.insert(profiles).values({
      userId: ithanUser.id,
      name: encrypt("Ithan Hunt"),
      age: 38,
      gender: "Male",
      bio: encrypt("Cricket lover and Bollywood fan. Always up for chai and good conversations."),
      city: "Mumbai",
      location: "Mumbai",
      interests: ["Cricket", "Chai", "Bollywood", "Music", "Travel", "Dancing"],
      photos: ["/uploads/photo-1770750512396-756030314.jpeg"],
      isVisible: true,
      aiPersonaEnabled: false,
      aiTone: "Friendly",
      aiLanguage: "Hinglish",
      aiProxyEnabled: false,
      aiChatPace: "Normal",
      intent: "Casual",
      intentLockedAt: new Date(),
      familyMode: false,
      festivalPrefs: [],
      hometownForFestivals: "Mumbai",
      interestedIn: ["Female"],
      dateReadiness: "Meet-ready",
      datingStyle: "The Adventurer",
    });
  }

  const existingRekha = await dbOrTx.select({ id: users.id }).from(users).where(sql`phone = '+917950903063'`);
  if (existingRekha.length === 0) {
    const [rekhaUser] = await dbOrTx
      .insert(users)
      .values({
        phone: "+917950903063",
        isVerified: true,
        respectScore: 93,
        membershipTier: "platinum",
        membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      })
      .returning();

    await dbOrTx.insert(profiles).values({
      userId: rekhaUser.id,
      name: encrypt("Rekha"),
      age: 30,
      gender: "Female",
      bio: encrypt("Bollywood enthusiast with a passion for art and fashion. Looking for meaningful connections."),
      city: "Hyderabad",
      location: "Jubilee Hills, Hyderabad",
      interests: ["Bollywood", "Art", "Fashion"],
      photos: ["/profiles/indian_female_1_5.jpg"],
      isVisible: true,
      aiPersonaEnabled: true,
      aiTone: "Witty",
      aiLanguage: "English",
      aiProxyEnabled: false,
      aiChatPace: "Normal",
      intent: "Casual",
      intentLockedAt: new Date(),
      familyMode: false,
      festivalPrefs: ["Ganesh Chaturthi", "Christmas"],
      hometownForFestivals: "Hyderabad",
      interestedIn: ["Male", "Trans"],
      dateReadiness: "Chat-only",
    });
  }
}
