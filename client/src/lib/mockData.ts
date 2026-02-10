import profile1 from "@/assets/profiles/profile1.jpg";
import profile2 from "@/assets/profiles/profile2.jpg";
import profile3 from "@/assets/profiles/profile3.jpg";
import profile4 from "@/assets/profiles/profile4.jpg";

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
    name: "Sarah",
    age: 24,
    bio: "Art lover & coffee enthusiast. Looking for someone to explore galleries with. 🎨☕️",
    image: profile1,
    respectScore: 98,
    location: "Brooklyn, NY",
    distance: "2 miles away",
    interests: ["Art", "Coffee", "Jazz", "Museums"]
  },
  {
    id: "2",
    name: "James",
    age: 27,
    bio: "Tech entrepreneur by day, city explorer by night. Always down for a rooftop drink. 🍸",
    image: profile2,
    respectScore: 92,
    location: "Manhattan, NY",
    distance: "4 miles away",
    interests: ["Tech", "Startups", "Photography", "Travel"]
  },
  {
    id: "3",
    name: "Elena",
    age: 25,
    bio: "Digital artist and dreamer. Let's create something beautiful together. ✨",
    image: profile3,
    respectScore: 95,
    location: "Queens, NY",
    distance: "5 miles away",
    interests: ["Design", "Illustration", "Nature", "Music"]
  },
  {
    id: "4",
    name: "Mike",
    age: 28,
    bio: "Hiking, biking, and everything outdoors. Let's go on an adventure! 🏔️",
    image: profile4,
    respectScore: 89,
    location: "Jersey City, NJ",
    distance: "8 miles away",
    interests: ["Hiking", "Camping", "Fitness", "Dogs"]
  }
];

export const MOCK_CHATS = [
  {
    id: "c1",
    userId: "1",
    lastMessage: "That new gallery looks amazing!",
    timestamp: "2m ago",
    unread: 2,
    aiHandover: false
  },
  {
    id: "c2",
    userId: "2",
    lastMessage: "Are you free this weekend?",
    timestamp: "1h ago",
    unread: 0,
    aiHandover: true
  }
];
