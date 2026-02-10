import profile1 from "@/assets/profiles/indian_girl_1.jpg";
import profile2 from "@/assets/profiles/indian_guy_1.jpg";
import profile3 from "@/assets/profiles/indian_girl_2.jpg";
import profile4 from "@/assets/profiles/indian_guy_2.jpg";

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
}

export const MOCK_PROFILES: UserProfile[] = [
  {
    id: "1",
    name: "Priya",
    age: 24,
    bio: "Classical dancer & chai lover. Looking for someone to explore heritage sites with. 💃☕️",
    image: profile1,
    respectScore: 98,
    location: "South Delhi",
    distance: "2 km away",
    interests: ["Kathak", "Chai", "Bollywood", "Travel"]
  },
  {
    id: "2",
    name: "Aryan",
    age: 27,
    bio: "Startup founder in BLR. Weekend cricketer and foodie. Always down for biryani. 🏏🥘",
    image: profile2,
    respectScore: 92,
    location: "Koramangala, BLR",
    distance: "5 km away",
    interests: ["Cricket", "Startups", "Biryani", "Tech"]
  },
  {
    id: "3",
    name: "Ananya",
    age: 25,
    bio: "NIFT grad. Fashion designer. Let's find the best street food in Mumbai. ✨",
    image: profile3,
    respectScore: 95,
    location: "Bandra West, Mumbai",
    distance: "3 km away",
    interests: ["Fashion", "Art", "Street Food", "Music"]
  },
  {
    id: "4",
    name: "Rohan",
    age: 28,
    bio: "Trekking in the Himalayas whenever I can. Dog dad to a Golden Retriever. 🐕🏔️",
    image: profile4,
    respectScore: 89,
    location: "Pune, MH",
    distance: "8 km away",
    interests: ["Trekking", "Dogs", "Photography", "Fitness"]
  }
];

export const MOCK_CHATS = [
  {
    id: "c1",
    userId: "1",
    lastMessage: "Have you tried the new cafe in CP?",
    timestamp: "2m ago",
    unread: 2,
    aiHandover: false
  },
  {
    id: "c2",
    userId: "2",
    lastMessage: "Match confirmed! See you at 7?",
    timestamp: "1h ago",
    unread: 0,
    aiHandover: true
  }
];
