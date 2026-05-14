export type Sentiment = "Positive" | "Negative" | "Neutral";

export interface Feedback {
  id: number;
  customer_name: string;
  feedback_text: string;
  sentiment: Sentiment;
  date: string;
}

export const feedback: Feedback[] = [
  { id: 1, customer_name: "Alice M.", feedback_text: "The new layout is incredibly intuitive. Great job!", sentiment: "Positive", date: "2026-05-10" },
  { id: 2, customer_name: "James B.", feedback_text: "I'm having trouble finding the settings menu since the update.", sentiment: "Negative", date: "2026-05-11" },
  { id: 3, customer_name: "Sarah L.", feedback_text: "Works fine, but loads a bit slow on mobile.", sentiment: "Neutral", date: "2026-05-12" },
  { id: 4, customer_name: "David K.", feedback_text: "Absolutely love the dark mode feature. My eyes thank you.", sentiment: "Positive", date: "2026-05-12" },
  { id: 5, customer_name: "Emma W.", feedback_text: "The app crashed twice when I tried to upload a photo.", sentiment: "Negative", date: "2026-05-13" },
  { id: 6, customer_name: "Tom H.", feedback_text: "Standard experience. Nothing special, but it gets the job done.", sentiment: "Neutral", date: "2026-05-14" },
];
