import { db } from "./db";
import { users, profiles } from "@shared/schema";
import { encrypt } from "./encryption";
import { sql } from "drizzle-orm";

const maleNames = ["Aarav", "Vihaan", "Aditya", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Shaurya", "Atharv", "Vivaan", "Advik", "Kabir", "Rohan", "Rahul", "Vikram", "Amit", "Siddharth", "Varun", "Karan", "Rohit", "Sameer", "Rishabh", "Nikhil", "Akash", "Deepak", "Manish", "Suresh", "Ravi", "Ankit", "Gaurav", "Pankaj", "Vishal", "Abhishek", "Kunal", "Raj", "Harsh", "Pranav", "Dhruv", "Utkarsh", "Mayank", "Nitin", "Sachin", "Saurabh", "Vijay", "Yash", "Zain", "Armaan", "Farhan", "Imran"];

const femaleNames = ["Aadya", "Diya", "Saanvi", "Ananya", "Kiara", "Pari", "Riya", "Myra", "Anvi", "Aadhya", "Priya", "Neha", "Sneha", "Pooja", "Anjali", "Kavita", "Divya", "Shweta", "Aditi", "Isha", "Meera", "Nisha", "Tanvi", "Roshni", "Sanjana", "Kriti", "Shruti", "Swati", "Nidhi", "Preeti", "Simran", "Sonali", "Pallavi", "Radhika", "Geeta", "Rekha", "Suman", "Vandana", "Bhavna", "Chhaya", "Jyoti", "Komal", "Lata", "Mamta", "Neelam", "Poonam", "Rani", "Sarita", "Usha", "Vidya"];

const transNames = ["Alex", "Jordan", "Krishna S.", "Shakti", "Noor", "Heer", "Kiran T.", "Sam", "Skylar", "Jamie", "Taylor", "Casey", "Riley", "Avery", "Morgan", "Quinn", "Reese", "Rowan", "Sage", "Charlie"];

const mumbaiPuneLocations = [
  { loc: "Bandra West, Mumbai", city: "Mumbai" },
  { loc: "Andheri, Mumbai", city: "Mumbai" },
  { loc: "Juhu, Mumbai", city: "Mumbai" },
  { loc: "Colaba, Mumbai", city: "Mumbai" },
  { loc: "Powai, Mumbai", city: "Mumbai" },
  { loc: "Worli, Mumbai", city: "Mumbai" },
  { loc: "Dadar, Mumbai", city: "Mumbai" },
  { loc: "Malad, Mumbai", city: "Mumbai" },
  { loc: "Goregaon, Mumbai", city: "Mumbai" },
  { loc: "Versova, Mumbai", city: "Mumbai" },
  { loc: "Koregaon Park, Pune", city: "Pune" },
  { loc: "Baner, Pune", city: "Pune" },
  { loc: "Viman Nagar, Pune", city: "Pune" },
  { loc: "Kothrud, Pune", city: "Pune" },
  { loc: "Aundh, Pune", city: "Pune" },
  { loc: "Kalyani Nagar, Pune", city: "Pune" },
  { loc: "Magarpatta, Pune", city: "Pune" },
  { loc: "Wakad, Pune", city: "Pune" },
  { loc: "Hinjewadi, Pune", city: "Pune" },
  { loc: "Shivajinagar, Pune", city: "Pune" },
];

const otherLocations = [
  { loc: "South Delhi", city: "Delhi" },
  { loc: "Connaught Place, Delhi", city: "Delhi" },
  { loc: "Hauz Khas, Delhi", city: "Delhi" },
  { loc: "Indiranagar, Bangalore", city: "Bangalore" },
  { loc: "Koramangala, Bangalore", city: "Bangalore" },
  { loc: "Whitefield, Bangalore", city: "Bangalore" },
  { loc: "Jubilee Hills, Hyderabad", city: "Hyderabad" },
  { loc: "Banjara Hills, Hyderabad", city: "Hyderabad" },
  { loc: "T Nagar, Chennai", city: "Chennai" },
  { loc: "Adyar, Chennai", city: "Chennai" },
  { loc: "Salt Lake, Kolkata", city: "Kolkata" },
  { loc: "Park Street, Kolkata", city: "Kolkata" },
  { loc: "Navrangpura, Ahmedabad", city: "Ahmedabad" },
  { loc: "Satellite, Ahmedabad", city: "Ahmedabad" },
  { loc: "C Scheme, Jaipur", city: "Jaipur" },
  { loc: "Vaishali Nagar, Jaipur", city: "Jaipur" },
  { loc: "Hazratganj, Lucknow", city: "Lucknow" },
  { loc: "Sector 17, Chandigarh", city: "Chandigarh" },
  { loc: "Marine Drive, Kochi", city: "Kochi" },
  { loc: "Panjim, Goa", city: "Goa" },
];

const interestsList = ["Bollywood", "Cricket", "Chai", "Street Food", "Yoga", "Tech", "Art", "Music", "Travel", "Reading", "Cooking", "Dancing", "Photography", "Fitness", "Meditation", "Gaming", "Fashion", "Startups", "Biriyani", "Hiking"];

const bios = [
  "Lover of chai and good conversations.",
  "Adventure seeker and travel enthusiast.",
  "Artist by heart, designer by profession.",
  "Tech geek who loves cricket.",
  "Foodie exploring the best street food spots.",
  "Yoga practitioner and mindfulness advocate.",
  "Bollywood buff looking for a movie partner.",
  "Startup founder dreaming big.",
  "Nature lover and weekend hiker.",
  "Music is my therapy. Let's jam!",
  "Dog parent and animal lover.",
  "Bookworm who loves coffee shops.",
  "Fitness freak and gym addict.",
  "Photographer chasing sunsets.",
  "Simple living, high thinking.",
  "Looking for someone to share chai with.",
  "Desi at heart, global in spirit.",
  "Life's too short for boring conversations.",
  "Biryani lover, cricket fanatic.",
  "Poetry writer and sunset chaser.",
];

const greenFlagAnswers = {
  "Something I'll never joke about": [
    "Someone's family or their insecurities",
    "Mental health struggles - been there myself",
    "Anyone's appearance or body",
    "Religious beliefs, even if different from mine",
    "Someone's past relationships or heartbreaks",
  ],
  "My idea of respect": [
    "Listening without judging, even when you disagree",
    "Showing up when you say you will",
    "Never raising your voice, even in arguments",
    "Respecting boundaries without being told twice",
    "Treating everyone equally - from CEO to chai-wallah",
  ],
  "One thing I'm healing from": [
    "Learning to not seek validation from others",
    "The pressure of being the 'perfect child'",
    "Overworking to prove my worth",
    "Trusting people after being let down",
    "Accepting that it's okay to not have everything figured out",
  ],
};

const festivals = ["Diwali", "Eid", "Navratri", "Christmas", "Holi", "Ganesh Chaturthi", "Onam", "Pongal", "Baisakhi", "Durga Puja"];
const intents = ["Casual", "Dating", "Serious", "Marriage"];

const malePhotos = [
  "/profiles/indian_male_1_1.jpg", "/profiles/indian_male_1_2.jpg", "/profiles/indian_male_1_3.jpg",
  "/profiles/indian_male_1_4.jpg", "/profiles/indian_male_1_5.jpg", "/profiles/indian_male_2_1.jpg",
  "/profiles/indian_male_2_2.jpg", "/profiles/indian_male_2_3.jpg", "/profiles/indian_male_2_4.jpg",
  "/profiles/indian_male_2_5.jpg",
];

const femalePhotos = [
  "/profiles/indian_female_1_1.jpg", "/profiles/indian_female_1_2.jpg", "/profiles/indian_female_1_3.jpg",
  "/profiles/indian_female_1_4.jpg", "/profiles/indian_female_1_5.jpg", "/profiles/indian_female_2_1.jpg",
  "/profiles/indian_female_2_2.jpg", "/profiles/indian_female_2_3.jpg", "/profiles/indian_female_2_4.jpg",
  "/profiles/indian_female_2_5.jpg",
];

const neutralPhotos = [
  "/profiles/indian_neutral_1_1.jpg", "/profiles/indian_neutral_1_2.jpg", "/profiles/indian_neutral_1_3.jpg",
];

const getRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomSubset = <T,>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

async function seed() {
  console.log("Seeding database with 120 profiles...");

  const existing = await db.select({ count: sql<number>`count(*)` }).from(profiles);
  if (Number(existing[0].count) > 0) {
    console.log(`Database already has ${existing[0].count} profiles. Skipping seed.`);
    return;
  }

  const createProfiles = async (
    names: string[],
    gender: "Male" | "Female" | "Trans",
    count: number
  ) => {
    for (let i = 0; i < count; i++) {
      const name = names[i % names.length];
      const isMumbaiPune = Math.random() < 0.5;
      const locationData = isMumbaiPune ? getRandom(mumbaiPuneLocations) : getRandom(otherLocations);

      const age = Math.floor(Math.random() * (35 - 21) + 21);
      const respectScore = Math.floor(Math.random() * (100 - 70) + 70);
      const bio = getRandom(bios);
      const interests = getRandomSubset(interestsList, 3 + Math.floor(Math.random() * 3));
      const photoPool = gender === "Male" ? malePhotos : gender === "Female" ? femalePhotos : neutralPhotos;
      const photo = getRandom(photoPool);

      const intent = getRandom(intents);
      const familyMode = Math.random() < 0.25;
      const festivalPrefs = getRandomSubset(festivals, 2 + Math.floor(Math.random() * 3));

      const greenFlagStories = Object.entries(greenFlagAnswers).map(([prompt, answers]) => ({
        prompt,
        answer: Math.random() > 0.3 ? getRandom(answers) : "",
      })).filter(s => s.answer);

      const [user] = await db
        .insert(users)
        .values({
          phone: `+91${Math.floor(7000000000 + Math.random() * 3000000000)}`,
          isVerified: true,
          respectScore,
        })
        .returning();

      await db.insert(profiles).values({
        userId: user.id,
        name: encrypt(name),
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
        aiProxyEnabled: Math.random() > 0.7,
        aiChatPace: getRandom(["Slow", "Normal", "Fast"]),
        intent,
        intentLockedAt: new Date(),
        familyMode,
        festivalPrefs,
        hometownForFestivals: locationData.city,
        greenFlagStories,
      });
    }
  };

  await createProfiles(maleNames, "Male", 50);
  console.log("Created 50 male profiles");

  await createProfiles(femaleNames, "Female", 50);
  console.log("Created 50 female profiles");

  await createProfiles(transNames, "Trans", 20);
  console.log("Created 20 trans profiles");

  console.log("Seeding complete! 120 profiles created.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
