export const videoList = [
  "I am feeling dizzy right now.mp4",
  "I am feeling very tired today.mp4",
  "I am going to school right now.mp4",
  "I am happy to see you today.mp4",
  "I am hungry can you help.mp4",
  "I am in danger please help me.mp4",
  "I am not feeling well today.mp4",
  "I am thirsty please give water.mp4",
  "I am very weak please help.mp4",
  "I made a mistake today.mp4",
  "I need help right now please.mp4",
  "I’ll Be Back Home Soon.mp4",
  "My name is Karthi nice to meet.mp4",
  "Please come quickly I need help.mp4",
  "See you again have a good day.mp4",
  "Sit down and listen carefully.mp4",
  "Sorry I made a mistake today.mp4",
  "What is your name please tell.mp4",
  "Where are you going right now.mp4",
  "Where is the nearest hospital here.mp4"
];

const normalize = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

export type MatchResult = {
  video: string;
  matchedKeywords: string[];
  confidence: number;
};

export function findBestMatch(inputText: string, videos: string[]): MatchResult {
  const normInput = normalize(inputText);
  const inputWords = normInput.split(" ");
  
  if (!normInput) {
    // If empty input, return random fallback
    const randomFallback = videos[Math.floor(Math.random() * videos.length)];
    return { video: randomFallback, matchedKeywords: [], confidence: 0 };
  }

  // 1. Exact Match
  for (const video of videos) {
    const videoBaseName = normalize(video.replace(".mp4", ""));
    if (videoBaseName === normInput) {
      return {
        video,
        matchedKeywords: inputWords,
        confidence: 100
      };
    }
  }

  // variables for tracing best match
  let bestVideo = "";
  let highestScore = -1;
  let bestKeywords: string[] = [];

  for (const video of videos) {
    const videoBaseName = normalize(video.replace(".mp4", ""));
    const videoWords = videoBaseName.split(" ");
    
    let score = 0;
    const matchedWords: string[] = [];

    // 2. & 3. Keyword and Partial Match
    for (const word of inputWords) {
      if (videoWords.includes(word)) {
        score += 10; // Exact word match
        matchedWords.push(word);
      } else {
        // Partial word match (e.g. "feel" in "feeling")
        // To avoid false positives, require at least 3 chars for partial matching
        if (word.length >= 3) {
          const isPartial = videoWords.some(vw => vw.includes(word) || word.includes(vw));
          if (isPartial) {
            score += 3;
            matchedWords.push(word);
          }
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestVideo = video;
      bestKeywords = matchedWords;
    }
  }

  // If score is > 0, we found a match
  if (highestScore > 0 && bestVideo) {
    return {
      video: bestVideo,
      matchedKeywords: bestKeywords,
      confidence: Math.min(Math.round((bestKeywords.length / inputWords.length) * 100), 99)
    };
  }

  // 4. Fallback: random video
  const randomFallback = videos[Math.floor(Math.random() * videos.length)];
  return {
    video: randomFallback,
    matchedKeywords: ["random fallback"],
    confidence: 0
  };
}
