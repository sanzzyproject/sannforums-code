import GitHubStorage from "../lib/github.js";
import { corsHeaders } from "../lib/auth.js";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  try {
    // Split the URL to get id
    const path = req.url.split('/');
    const id = path[2]; // snippet ID
    
    if (req.method === "GET") {
      if (!id) {
        return res.status(400).json({ error: "Missing snippet ID" });
      }

      const github = new GitHubStorage();

      // Get snippet metadata
      const snippetResult = await github.getFile(`snippets/${id}.json`);
      
      if (!snippetResult.success) {
        return res.status(404).json({ error: "Snippet not found" });
      }

      // Get code content
      const codeResult = await github.getFile(`codes/${id}.txt`);
      
      if (!codeResult.success) {
        return res.status(404).json({ error: "Code content not found" });
      }

      // Get stats
      const statsResult = await github.getFile(`stats/${id}.json`);
      let stats = { views: 0, copies: 0 };
      
      if (statsResult.success) {
        stats = JSON.parse(statsResult.data);
      }

      return res.status(200).json({
        success: true,
        id,
        snippet: JSON.parse(snippetResult.data),
        code: codeResult.data,
        stats,
      });
    }
    
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Get code error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
