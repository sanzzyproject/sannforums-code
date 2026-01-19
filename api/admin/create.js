import GitHubStorage from "../../lib/github.js";
import { requireAdmin, corsHeaders } from "../../lib/auth.js";
import { nanoid } from "nanoid";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  try {
    // Check admin authentication
    requireAdmin(req);
    
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { title, language, description, code } = req.body;

    if (!title || !language || !code) {
      return res.status(400).json({ 
        error: "Missing required fields: title, language, code" 
      });
    }

    // Generate unique ID
    const id = nanoid(10);
    const github = new GitHubStorage();

    // Create snippet metadata
    const snippetData = {
      id,
      title,
      language,
      description: description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save snippet metadata
    const snippetResult = await github.createFile(
      `snippets/${id}.json`,
      JSON.stringify(snippetData, null, 2),
      `Create snippet: ${title}`
    );

    if (!snippetResult.success) {
      return res.status(500).json({ error: "Failed to save snippet data" });
    }

    // Save code content
    const codeResult = await github.createFile(
      `codes/${id}.txt`,
      code,
      `Create code for: ${title}`
    );

    if (!codeResult.success) {
      // Rollback: delete the snippet file if code save fails
      await github.deleteFile(
        `snippets/${id}.json`,
        `Rollback failed creation`,
        snippetResult.data.content.sha
      );
      return res.status(500).json({ error: "Failed to save code" });
    }

    // Initialize stats
    const statsData = {
      id,
      views: 0,
      copies: 0,
      lastViewed: null,
      lastCopied: null,
    };

    await github.createFile(
      `stats/${id}.json`,
      JSON.stringify(statsData, null, 2),
      `Initialize stats for: ${title}`
    );

    return res.status(201).json({
      success: true,
      id,
      url: `${process.env.VERCEL_URL || "https://sannforums-code.vercel.app"}/code.html?id=${id}`,
      snippet: snippetData,
    });
  } catch (error) {
    if (error.message.includes("Unauthorized")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    console.error("Create error:", error);
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
