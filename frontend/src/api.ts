import type { AppFlow, GenerateOptions, GenerationStep } from "./types";

const API_URL = "http://localhost:8000";


export async function* generateAppFlow(prompt: string, options: GenerateOptions) {
  const response = await fetch(`${API_URL}/generate`, { // to get website 
    method: "POST", // sending 
    headers: { "Content-Type": "application/json" }, // tells the backend i am sanding the data
    body: JSON.stringify({
      prompt,
      primary_color: options.primaryColor,
      style: options.style,
    }),
  });

  const reader = response.body!.getReader(); // to read chunk 
  const decoder = new TextDecoder(); // network send data and converts bytes to text ; send binary over text 

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(line => line.startsWith("data: "));

    for (const line of lines) {
      const json = line.replace("data: ", "");
      const event = JSON.parse(json);

      if (event.type === "step") {
        yield { type: "step" as const, data: event.data as GenerationStep };
      } else if (event.type === "result") {
        yield { type: "result" as const, data: event.data as AppFlow };
      } else if (event.type === "error") {
        throw new Error(event.data.message);
      }
    }
  }
}// runs as much as chunks 


/* 
generateAppFlow() called by App.tsx
  │
  ├── fetch() → sends POST to backend
  │
  ├── backend streams: "data: {step 1}\n\n"
  │     reader.read() gets chunk
  │     decoder turns bytes → text
  │     split + filter → clean JSON string
  │     JSON.parse → JS object
  │     yield → App.tsx receives {type:"step", data:{step:1...}}
  │     App.tsx updates progress bar ✓
  │
  ├── backend streams: "data: {step 2}\n\n"
  │     same process → yield → App.tsx updates ✓
  │
  └── backend streams: "data: {result}\n\n"
        same process → yield → App.tsx stores app flow ✓

    */