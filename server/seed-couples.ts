import { db } from "./db";
import { users, profiles } from "@shared/schema";
import { encrypt } from "./encryption";
import { sql } from "drizzle-orm";

const couplePhotos = [
  "/profiles/indian_couple_1_1.jpg", "/profiles/indian_couple_1_2.jpg", "/profiles/indian_couple_1_3.jpg",
  "/profiles/indian_couple_1_4.jpg", "/profiles/indian_couple_1_5.jpg", "/profiles/indian_couple_1_6.jpg",
  "/profiles/indian_couple_1_7.jpg", "/profiles/indian_couple_1_8.jpg", "/profiles/indian_couple_1_9.jpg",
  "/profiles/indian_couple_1_10.jpg",
];

const coupleNames = [
  "Aarav & Priya", "Rohan & Sneha", "Vikram & Anjali", "Arjun & Diya", "Kabir & Meera",
  "Siddharth & Aditi", "Varun & Riya", "Karan & Isha", "Rahul & Neha", "Amit & Pooja",
  "Rishabh & Tanvi", "Nikhil & Kriti", "Akash & Simran", "Deepak & Nidhi", "Rohit & Sanjana",
  "Sameer & Pallavi", "Gaurav & Divya", "Kunal & Shruti", "Raj & Radhika", "Pranav & Swati",
  "Harsh & Sonali", "Dhruv & Preeti", "Yash & Komal", "Armaan & Jyoti", "Farhan & Nisha",
  "Vivaan & Kavita", "Shaurya & Bhavna", "Atharv & Roshni", "Ishaan & Pari", "Manish & Geeta",
  "Vishal & Rekha", "Abhishek & Vandana", "Sachin & Chhaya", "Saurabh & Mamta", "Vijay & Lata",
  "Utkarsh & Neelam", "Mayank & Poonam", "Nitin & Sarita", "Pankaj & Usha", "Ankit & Vidya",
  "Imran & Aadya", "Zain & Saanvi", "Reyansh & Ananya", "Sai & Kiara", "Krishna & Myra",
  "Advik & Anvi", "Aarav J. & Aadhya", "Vihaan & Shweta", "Aditya K. & Rani", "Rohan M. & Suman",
];

const coupleBios = [
  "We're a fun-loving couple looking to connect with like-minded pairs!",
  "Together 3 years and counting. Looking for double date partners!",
  "Foodies who love trying new restaurants together.",
  "Adventure couple - hiking, road trips, and new experiences!",
  "Bollywood movie nights are our thing. Looking for couple friends!",
  "We bonded over chai and cricket. Want to meet similar couples!",
  "Travel buddies exploring India one city at a time.",
  "Dance couple looking for partners for salsa nights!",
  "We love cooking together - looking for couples who share the passion!",
  "Fitness enthusiasts seeking active couple friends.",
  "Startup founders who fell in love at a hackathon.",
  "Music lovers - we jam every weekend!",
  "Photography couple capturing moments across India.",
  "Yoga practitioners living a mindful life together.",
  "Dog parents looking for pet-friendly couple hangouts.",
];

const mumbaiPuneLocations = [
  { loc: "Bandra West, Mumbai", city: "Mumbai" },
  { loc: "Andheri, Mumbai", city: "Mumbai" },
  { loc: "Juhu, Mumbai", city: "Mumbai" },
  { loc: "Colaba, Mumbai", city: "Mumbai" },
  { loc: "Powai, Mumbai", city: "Mumbai" },
  { loc: "Worli, Mumbai", city: "Mumbai" },
  { loc: "Koregaon Park, Pune", city: "Pune" },
  { loc: "Baner, Pune", city: "Pune" },
  { loc: "Viman Nagar, Pune", city: "Pune" },
  { loc: "Kothrud, Pune", city: "Pune" },
];

const otherLocations = [
  { loc: "South Delhi", city: "Delhi" },
  { loc: "Hauz Khas, Delhi", city: "Delhi" },
  { loc: "Indiranagar, Bangalore", city: "Bangalore" },
  { loc: "Koramangala, Bangalore", city: "Bangalore" },
  { loc: "Jubilee Hills, Hyderabad", city: "Hyderabad" },
  { loc: "Banjara Hills, Hyderabad", city: "Hyderabad" },
  { loc: "T Nagar, Chennai", city: "Chennai" },
  { loc: "Salt Lake, Kolkata", city: "Kolkata" },
  { loc: "Navrangpura, Ahmedabad", city: "Ahmedabad" },
  { loc: "C Scheme, Jaipur", city: "Jaipur" },
];

const interestsList = ["Bollywood", "Cricket", "Chai", "Street Food", "Yoga", "Tech", "Art", "Music", "Travel", "Reading", "Cooking", "Dancing", "Photography", "Fitness", "Meditation", "Gaming", "Fashion", "Startups", "Biriyani", "Hiking"];

const festivals = ["Diwali", "Eid", "Navratri", "Christmas", "Holi", "Ganesh Chaturthi", "Onam", "Pongal", "Baisakhi", "Durga Puja"];
const intents = ["Casual", "Dating", "Serious", "Marriage"];

const greenFlagAnswers = {
  "Something I'll never joke about": [
    "Someone's family or their insecurities",
    "Mental health struggles - been there myself",
    "Anyone's appearance or body",
    "Religious beliefs, even if different from mine",
  ],
  "My idea of respect": [
    "Listening without judging, even when you disagree",
    "Showing up when you say you will",
    "Never raising your voice, even in arguments",
    "Treating everyone equally - from CEO to chai-wallah",
  ],
  "One thing I'm healing from": [
    "Learning to not seek validation from others",
    "The pressure of being the 'perfect child'",
    "Overworking to prove my worth",
    "Trusting people after being let down",
  ],
};

const getRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomSubset = <T,>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

async function seedCouples() {
  console.log("Adding 50 couple profiles...");

  for (let i = 0; i < 50; i++) {
    const name = coupleNames[i];
    const isMumbaiPune = Math.random() < 0.5;
    const locationData = isMumbaiPune ? getRandom(mumbaiPuneLocations) : getRandom(otherLocations);
    const age = Math.floor(Math.random() * (38 - 22) + 22);
    const respectScore = Math.floor(Math.random() * (100 - 75) + 75);
    const bio = getRandom(coupleBios);
    const interests = getRandomSubset(interestsList, 3 + Math.floor(Math.random() * 3));
    const photo = getRandom(couplePhotos);
    const intent = getRandom(intents);
    const familyMode = Math.random() < 0.3;
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
      gender: "Couple",
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
      interestedIn: ["Couple", "Female"],
      dateReadiness: getRandom(["Chat-only", "Voice-ready", "Meet-ready"]),
    });

    if ((i + 1) % 10 === 0) console.log(`Created ${i + 1}/50 couple profiles...`);
  }

  console.log("Done! 50 couple profiles added.");
}

seedCouples()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
