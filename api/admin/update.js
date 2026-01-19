import GitHubStorage from "../../../lib/github.js";
import { requireAdmin, corsHeaders } from "../../../lib/auth.js";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  try {
    // Check admin authentication
    requireAdmin(req);
    
    if (req.method !== "PUT") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id } = req.query;
    const { title, language, description, code } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Missing snippet ID" });
    }

    const github = new GitHubStorage();

    // Get current snippet to update
    const snippetResult = await github.getFile(`snippets/${id}.json`);
    
    if (!snippetResult.success) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    const currentSnippet = JSON.parse(snippetResult.data);
    
    // Update snippet metadata
    const updatedSnippet = {
      ...currentSnippet,
      title: title || currentSnippet.title,
      language: language || currentSnippet.language,
      description: description !== undefined ? description : currentSnippet.description,
      updatedAt: new Date().toISOString(),
    };

    // Update snippet file
    const updateSnippetResult = await github.updateFile(
      `snippets/${id}.json`,
      JSON.stringify(updatedSnippet, null, 2),
      `Update snippet: ${updatedSnippet.title}`,
      snippetResult.sha
    );

    if (!updateSnippetResult.success) {
      return res.status(500).json({ error: "Failed to update snippet" });
    }

    // Update code file if provided
    if (code) {
      const codeResult = await github.getFileSHA(`codes/${id}.txt`);
      
      if (codeResult.success) {
        await github.updateFile(
          `codes/${id}.txt`,
          code,
          `Update code for: ${updatedSnippet.title}`,
          codeResult.sha
        );
      }
    }

    return res.status(200).json({
      success: true,
      snippet: updatedSnippet,
    });
  } catch (error) {
    if (error.message.includes("Unauthorized")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    console.error("Update error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
