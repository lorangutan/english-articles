export type Topic = {
  slug: string;
  label: string;
  /** The Conversation Atom feed paths (relative to theconversation.com). Topic feeds are
   *  selected by their numeric id; theconversation.com/topics/<name> redirects to the right one. */
  feeds: string[];
  /** Search terms for Simple English Wikipedia, used for beginner material. */
  wiki: string[];
};

export const TOPICS: Topic[] = [
  { slug: "science", label: "Science & Space", feeds: ["global/topics/space-51", "global/topics/science-1256", "global/topics/physics-154"], wiki: ["planet", "space", "physics", "chemistry", "invention"] },
  { slug: "technology", label: "Technology", feeds: ["global/technology", "global/topics/artificial-intelligence-ai-90"], wiki: ["computer", "internet", "robot", "machine", "telephone"] },
  { slug: "health", label: "Health & Mind", feeds: ["global/health", "global/topics/psychology-28", "global/topics/sleep-93"], wiki: ["health", "sleep", "exercise", "medicine", "emotion"] },
  { slug: "environment", label: "Nature & Climate", feeds: ["global/environment", "global/topics/climate-change-27"], wiki: ["animal", "forest", "ocean", "weather", "bird"] },
  { slug: "culture", label: "Arts & Culture", feeds: ["global/arts", "global/topics/music-12", "global/topics/film-1175", "global/topics/books-1687"], wiki: ["music", "painting", "film", "festival", "novel"] },
  { slug: "business", label: "Business & Money", feeds: ["global/business", "global/topics/economics-488"], wiki: ["money", "company", "market", "trade", "bank"] },
  { slug: "history", label: "History", feeds: ["global/topics/history-180", "global/topics/archaeology-695"], wiki: ["ancient", "empire", "war", "castle", "explorer"] },
  { slug: "food", label: "Food & Travel", feeds: ["global/topics/food-260", "global/topics/tourism-471", "global/topics/travelling-49966"], wiki: ["food", "fruit", "city", "island", "country"] },
  { slug: "sport", label: "Sport", feeds: ["global/topics/sport-480", "global/topics/football-482", "global/topics/olympic-games-6108"], wiki: ["football", "olympic", "tennis", "athlete", "swimming"] },
];

export const TOPIC_SLUGS = TOPICS.map((t) => t.slug);

export function topicLabel(slug: string) {
  return TOPICS.find((t) => t.slug === slug)?.label ?? slug;
}
