import profile1 from "@/assets/profiles/indian_girl_1.jpg";
import profile2 from "@/assets/profiles/indian_guy_1.jpg";
import profile3 from "@/assets/profiles/indian_girl_2.jpg";
import profile4 from "@/assets/profiles/indian_guy_2.jpg";
import generic1 from "@/assets/profiles/generic_indian_1.jpg";
import generic2 from "@/assets/profiles/generic_indian_2.jpg";
import generic3 from "@/assets/profiles/generic_indian_3.jpg";

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  image: string;
  respectScore: number;
  location: string;
  distance: string;
  interests: string[];
  gender: "Male" | "Female" | "Trans";
}

// Arrays for generating data
const maleNames = ["Aarav", "Vihaan", "Aditya", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Shaurya", "Atharv", "Vivaan", "Advik", "Kabir", "Rohan", "Rahul", "Vikram", "Amit", "Siddharth", "Varun", "Karan", "Rohit", "Sameer", "Rishabh", "Nikhil", "Akash", "Deepak", "Manish", "Suresh", "Ravi", "Ankit", "Gaurav", "Pankaj", "Vishal", "Abhishek", "Kunal", "Raj", "Harsh", "Pranav", "Dhruv", "Utkarsh", "Mayank", "Nitin", "Sachin", "Saurabh", "Vijay", "Yash", "Zain", "Armaan", "Farhan", "Imran"];

const femaleNames = ["Aadya", "Diya", "Saanvi", "Ananya", "Kiara", "Pari", "Riya", "Myra", "Anvi", "Aadhya", "Priya", "Neha", "Sneha", "Pooja", "Anjali", "Kavita", "Divya", "Shweta", "Aditi", "Isha", "Meera", "Nisha", "Tanvi", "Roshni", "Sanjana", "Kriti", "Shruti", "Swati", "Nidhi", "Preeti", "Simran", "Sonali", "Pallavi", "Radhika", "Geeta", "Rekha", "Suman", "Vandana", "Bhavna", "Chhaya", "Jyoti", "Komal", "Lata", "Mamta", "Neelam", "Poonam", "Rani", "Sarita", "Usha", "Vidya"];

const transNames = ["Alex", "Jordan", "Krishna", "Shakti", "Noor", "Heer", "Kiran", "Sam", "Skylar", "Jamie", "Taylor", "Casey", "Riley", "Avery", "Morgan", "Quinn", "Reese", "Rowan", "Sage", "Charlie"];

const mumbaiPuneLocations = ["Bandra West, Mumbai", "Andheri, Mumbai", "Juhu, Mumbai", "Colaba, Mumbai", "Powai, Mumbai", "Worli, Mumbai", "Dadar, Mumbai", "Malad, Mumbai", "Goregaon, Mumbai", "Versova, Mumbai", "Koregaon Park, Pune", "Baner, Pune", "Viman Nagar, Pune", "Kothrud, Pune", "Aundh, Pune", "Kalyani Nagar, Pune", "Magarpatta, Pune", "Wakad, Pune", "Hinjewadi, Pune", "Shivajinagar, Pune"];

const otherCities = ["South Delhi", "Connaught Place, Delhi", "Hauz Khas, Delhi", "Indiranagar, Bangalore", "Koramangala, Bangalore", "Whitefield, Bangalore", "Jubilee Hills, Hyderabad", "Banjara Hills, Hyderabad", "T Nagar, Chennai", "Adyar, Chennai", "Salt Lake, Kolkata", "Park Street, Kolkata", "Navrangpura, Ahmedabad", "Satellite, Ahmedabad", "C Scheme, Jaipur", "Vaishali Nagar, Jaipur", "Hazratganj, Lucknow", "Sector 17, Chandigarh", "Marine Drive, Kochi", "Panjim, Goa"];

const interestsList = ["Bollywood", "Cricket", "Chai", "Street Food", "Yoga", "Tech", "Art", "Music", "Travel", "Reading", "Cooking", "Dancing", "Photography", "Fitness", "Meditation", "Gaming", "Fashion", "Startups", "Politics", "History"];

const bios = [
  "Lover of chai and good conversations. ☕️",
  "Adventure seeker and travel enthusiast. ✈️",
  "Artist by heart, designer by profession. 🎨",
  "Tech geek who loves cricket. 🏏",
  "Foodie exploring the best street food spots. 🥘",
  "Yoga practitioner and mindfulness advocate. 🧘",
  "Bollywood buff looking for a movie partner. 🎬",
  "Startup founder dreaming big. 🚀",
  "Nature lover and weekend hiker. 🏔️",
  "Music is my therapy. Let's jam! 🎸",
  "Dog parent and animal lover. 🐕",
  "Bookworm who loves coffee shops. 📚",
  "Fitness freak and gym addict. 💪",
  "Photographer chasing sunsets. 📸",
  "Simple living, high thinking. ✨"
];

// Helper to get random item from array
const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const getRandomSubset = (arr: any[], count: number) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Generate Profiles
const generateProfiles = (): UserProfile[] => {
  const profiles: UserProfile[] = [];
  const images = [profile1, profile2, profile3, profile4, generic1, generic2, generic3];

  let idCounter = 1;

  const createProfile = (gender: "Male" | "Female" | "Trans", nameList: string[]) => {
    const name = getRandom(nameList);
    // 50% chance for Mumbai/Pune
    const isMumbaiPune = Math.random() < 0.5;
    const location = isMumbaiPune ? getRandom(mumbaiPuneLocations) : getRandom(otherCities);
    
    // Weighted respect score (mostly high for this respectful app)
    const respectScore = Math.floor(Math.random() * (100 - 80) + 80); 

    profiles.push({
      id: idCounter.toString(),
      name,
      age: Math.floor(Math.random() * (35 - 21) + 21),
      bio: getRandom(bios),
      image: getRandom(images),
      respectScore,
      location,
      distance: `${Math.floor(Math.random() * 15 + 1)} km away`,
      interests: getRandomSubset(interestsList, 3),
      gender
    });
    idCounter++;
  };

  // Generate 50 Males
  for (let i = 0; i < 50; i++) createProfile("Male", maleNames);
  
  // Generate 50 Females
  for (let i = 0; i < 50; i++) createProfile("Female", femaleNames);

  // Generate 20 Trans
  for (let i = 0; i < 20; i++) createProfile("Trans", transNames);

  // Shuffle the final array so genders are mixed
  return profiles.sort(() => 0.5 - Math.random());
};

export const MOCK_PROFILES = generateProfiles();

export const MOCK_CHATS = [
  {
    id: "c1",
    userId: MOCK_PROFILES[0].id, // Dynamic based on generated profiles
    lastMessage: "Have you tried the new cafe in CP?",
    timestamp: "2m ago",
    unread: 2,
    aiHandover: false
  },
  {
    id: "c2",
    userId: MOCK_PROFILES[1].id,
    lastMessage: "Match confirmed! See you at 7?",
    timestamp: "1h ago",
    unread: 0,
    aiHandover: true
  }
];
