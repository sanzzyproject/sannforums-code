import GitHubStorage from "../../../lib/github.js";
import { corsHeaders } from "../../../lib/auth.js";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing snippet ID" });
    }

    const github = new GitHubStorage();

    // Get current stats
    const statsResult = await github.getFile(`stats/${id}.json`);
    
    if (!statsResult.success) {
      // Initialize stats if not exists
      const initialStats = {
        id,
        views: 1,
        copies: 0,
        lastViewed: new Date().toISOString(),
        lastCopied: null,
      };

      await github.createFile(
        `stats/${id}.json`,
        JSON.stringify(initialStats, null, 2),
        `Initialize stats for: ${id}`
      );

      return res.status(200).json({
        success: true,
        stats: initialStats,
      });
    }

    // Update existing stats
    const stats = JSON.parse(statsResult.data);
    stats.views = (stats.views || 0) + 1;
    stats.lastViewed = new Date().toISOString();

    const updateResult = await github.updateFile(
      `stats/${id}.json`,
      JSON.stringify(stats, null, 2),
      `Update view count: ${id}`,
      statsResult.sha
    );

    if (!updateResult.success) {
      return res.status(500).json({ error: "Failed to update stats" });
    }

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Update view stats error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
