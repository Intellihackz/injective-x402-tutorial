import fs from "fs";

let md = fs.readFileSync("Tutorial-Frontend.md", "utf-8");

const homeSrc = fs.readFileSync("client/src/Home.tsx", "utf-8");
const downloadSrc = fs.readFileSync("client/src/Download.tsx", "utf-8");
const utilsSrc = fs.readFileSync("client/src/utils.ts", "utf-8");

// We need to inject the utils section before Home.tsx
const utilsSection = `
## Utility Functions (\`utils.ts\`)

Let's extract our network configurations and helper functions into a separate file to keep our components clean.

Create \`client/src/utils.ts\`:

<details>
<summary>Click to view <code>src/utils.ts</code></summary>

\`\`\`typescript
${utilsSrc}
\`\`\`
</details>

## Environment Variables

Since our Express server runs on port \`3000\` and Vite runs on port \`5173\`, we cannot assume they share the same URL. We use an environment variable to point to the API.
Create a \`.env\` file in your \`client\` folder:

\`\`\`env
VITE_API_URL=http://localhost:3000
\`\`\`

> 💡 **Human vs Agent URLs**: Our app generates two distinct URLs for the uploaded file:
> 1. **🧑 Human Pay (React UI)**: Points to the Vite frontend (e.g., \`http://localhost:5173/download/:id\`). This opens a browser interface where humans can connect MetaMask and click a button to pay.
> 2. **🤖 Agent Pay (Raw API)**: Points directly to the Express backend (e.g., \`http://localhost:3000/api/download/:id\`). This returns the raw \`402 Payment Required\` header that autonomous AI agents can read and fulfill programmatically without any UI!

`;

// Insert the utils section before "## The Upload Interface (`Home.tsx`)"
if (!md.includes("## Utility Functions (`utils.ts`)")) {
    md = md.replace("## The Upload Interface (`Home.tsx`)", utilsSection + "## The Upload Interface (`Home.tsx`)");
}

// Update Home.tsx block
md = md.replace(/<summary>Click to view <code>src\/Home\.tsx<\/code><\/summary>\s*```tsx[\s\S]*?```\s*<\/details>/m, `<summary>Click to view <code>src/Home.tsx</code></summary>\n\n\`\`\`tsx\n${homeSrc}\n\`\`\`\n</details>`);

// Update Download.tsx block
md = md.replace(/<summary>Click to view <code>src\/Download\.tsx<\/code><\/summary>\s*```tsx[\s\S]*?```\s*<\/details>/m, `<summary>Click to view <code>src/Download.tsx</code></summary>\n\n\`\`\`tsx\n${downloadSrc}\n\`\`\`\n</details>`);

fs.writeFileSync("Tutorial-Frontend.md", md);
console.log("Tutorial-Frontend.md synced successfully!");
