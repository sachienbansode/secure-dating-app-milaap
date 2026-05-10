import { db } from "./db";
import { users, profiles } from "@shared/schema";
import { encrypt } from "./encryption";
import { sql } from "drizzle-orm";

const maleNames = ["Aarav", "Vihaan", "Aditya", "Arjun", "Rohan"];
const femaleNames = ["Priya", "Ananya", "Diya", "Kiara", "Sneha"];
const transNames = ["Kiran", "Noor", "Shakti", "Alex", "Jordan"];
const coupleNames = ["Aarav & Priya", "Rohan & Sneha", "Vikram & Anjali", "Arjun & Diya", "Kabir & Meera"];

const DICEBEAR = (style: string, seed: string, bg: string) =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&scale=90`;

const malePhotos = [
  DICEBEAR("avataaars", "AaravMumbai", "b6e3f4"),
  DICEBEAR("avataaars", "VihaanPune", "b6e3f4"),
  DICEBEAR("avataaars", "AdityaBangalore", "b6e3f4"),
  DICEBEAR("avataaars", "ArjunDelhi", "b6e3f4"),
  DICEBEAR("avataaars", "RohanHyderabad", "b6e3f4"),
];

const femalePhotos = [
  DICEBEAR("avataaars", "PriyaMumbai", "ffdfbf"),
  DICEBEAR("avataaars", "AnanyaPune", "ffdfbf"),
  DICEBEAR("avataaars", "DiyaBangalore", "ffdfbf"),
  DICEBEAR("avataaars", "KiaraDelhi", "ffdfbf"),
  DICEBEAR("avataaars", "SnehaMumbai", "ffdfbf"),
];

const neutralPhotos = [
  DICEBEAR("avataaars", "KiranNeutral", "d1d4f9"),
  DICEBEAR("avataaars", "NoorNeutral", "d1d4f9"),
  DICEBEAR("avataaars", "ShaktiNeutral", "d1d4f9"),
  DICEBEAR("avataaars", "AlexNeutral", "d1d4f9"),
  DICEBEAR("avataaars", "JordanNeutral", "d1d4f9"),
];

const couplePhotos = [
  DICEBEAR("avataaars", "AaravPriyaCouple", "c0aede"),
  DICEBEAR("avataaars", "RohanSnehaCouple", "c0aede"),
  DICEBEAR("avataaars", "VikramAnjaliCouple", "c0aede"),
  DICEBEAR("avataaars", "ArjunDiyaCouple", "c0aede"),
  DICEBEAR("avataaars", "KabirMeeraCouple", "c0aede"),
];

const locations = [
  { loc: "Bandra West, Mumbai", city: "Mumbai" },
  { loc: "Koregaon Park, Pune", city: "Pune" },
  { loc: "Indiranagar, Bangalore", city: "Bangalore" },
  { loc: "Hauz Khas, Delhi", city: "Delhi" },
  { loc: "Jubilee Hills, Hyderabad", city: "Hyderabad" },
];

const bios = [
  "Software engineer by day, chai enthusiast always. I love deep conversations, weekend treks, and finding hidden biryani spots across Mumbai. Big cricket fan — will happily debate match strategy for hours. Looking for someone genuine who doesn't take life too seriously.",
  "Adventure seeker based in Pune — if there's a hill station or a street food trail within 200km, I've probably been there. I work in design and find inspiration everywhere. Bollywood movie marathons are my love language. Let's explore the world one chai at a time.",
  "Tech geek who codes by day and plays cricket on weekends. I'm a proud Bangalorean who still misses Mumbai's vada pav. I believe great conversations are the foundation of every good relationship. Honest, low-drama, and genuinely curious about people.",
  "Mumbai girl with a heart full of Bollywood dreams. I work in marketing and love crafting stories — both at work and in real life. Fitness, yoga, and good food keep me balanced. Looking for someone who's kind, funny, and can keep up with my energy.",
  "Hyderabadi foodie and travel junkie who's visited 18 states so far (and counting!). I'm a doctor who believes in work-life balance — photography and hiking are my therapy. Family matters deeply to me. Looking for a partner who shares big dreams and bigger laughter.",
];

const coupleBios = [
  "We met at a Bollywood karaoke night and never looked back! Together 3 years, based in Mumbai. We love road trips, trying new cuisines, and hosting game nights. Looking to connect with like-minded couples for double dates and good times.",
  "Adventure junkies who bonded over a Ladakh road trip. We hike, travel, and cook together — life is one big project. We're warm, fun, and love meeting new people. If you enjoy the outdoors and good conversations, we'd love to meet!",
  "Both engineers, both foodies — we debate restaurant choices more than anything else! Together 2 years in Pune. We enjoy cricket matches, art exhibitions, and lazy Sunday brunches. Seeking couple friends who appreciate genuine connections.",
  "We bonded over chai and a heated IPL argument (she was right). Now we travel, cook, and embarrass each other at dance floors. Based in Bangalore. Looking for couples who love mixing humor, culture, and good food.",
  "Fitness couple who met at a gym and realized we had the same playlist. We run half-marathons together and unwind with Bollywood classics. Based in Delhi. Looking for active couples who balance hustle with heart.",
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

const ITHAN_AVATAR = `https://api.dicebear.com/7.x/avataaars/svg?seed=IthanHuntFounder&backgroundColor=b6e3f4&scale=90`;
const REKHA_AVATAR = `https://api.dicebear.com/7.x/avataaars/svg?seed=RekhaFounderHyd&backgroundColor=ffdfbf&scale=90`;

async function updateAllAvatarsToDiceBear() {
  const maleSeeds = malePhotos;
  const femaleSeeds = femalePhotos;
  const neutralSeeds = neutralPhotos;
  const coupleSeeds = couplePhotos;

  const allSeedUsers = await db.select({ id: users.id, phone: users.phone }).from(users).where(sql`phone LIKE '+91990000%'`);
  for (let i = 0; i < allSeedUsers.length; i++) {
    const u = allSeedUsers[i];
    let photo: string;
    if (i < 5) photo = maleSeeds[i % 5];
    else if (i < 10) photo = femaleSeeds[(i - 5) % 5];
    else if (i < 15) photo = neutralSeeds[(i - 10) % 5];
    else photo = coupleSeeds[(i - 15) % 5];
    await db.execute(sql`UPDATE profiles SET photos = ARRAY[${photo}]::text[] WHERE user_id = ${u.id}`);
  }

  const ithanRows = await db.select({ id: users.id }).from(users).where(sql`phone = '+919820098200'`);
  if (ithanRows.length > 0) {
    await db.execute(sql`UPDATE profiles SET photos = ARRAY[${ITHAN_AVATAR}]::text[] WHERE user_id = ${ithanRows[0].id}`);
  }

  const rekhaRows = await db.select({ id: users.id }).from(users).where(sql`phone = '+917950903063'`);
  if (rekhaRows.length > 0) {
    await db.execute(sql`UPDATE profiles SET photos = ARRAY[${REKHA_AVATAR}]::text[] WHERE user_id = ${rekhaRows[0].id}`);
  }
  console.log("Auto-seed: Updated all profiles to DiceBear cartoon avatars.");
}

export async function autoSeedProfiles() {
  const seedUsers = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`phone LIKE '+91990000%'`);
  const seedCount = Number(seedUsers[0].count);
  if (seedCount >= 20) {
    console.log(`Auto-seed: ${seedCount} seed profiles already exist, skipping seed profiles.`);
    await seedFounderProfiles();
    await updateAllAvatarsToDiceBear();
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
          expectations: phoneCounter <= 5 ? "Strict NO to paid benefits/FWB" : "Okay with both",
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
      photos: [ITHAN_AVATAR],
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
      expectations: "Okay with both",
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
      photos: [REKHA_AVATAR],
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
      expectations: "Okay with both",
    });
  }
}
