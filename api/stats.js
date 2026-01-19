import GitHubStorage from "../lib/github.js";
import { corsHeaders } from "../lib/auth.js";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  try {
    // Split the URL to get action and id
    const path = req.url.split('/');
    const action = path[2]; // 'view' or 'copy'
    const id = path[3]; // snippet ID
    
    if (!action || !id) {
      return res.status(400).json({ error: "Missing action or ID" });
    }
    
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const github = new GitHubStorage();

    // Get current stats
    const statsResult = await github.getFile(`stats/${id}.json`);
    
    if (!statsResult.success) {
      // Initialize stats if not exists
      const initialStats = {
        id,
        views: action === 'view' ? 1 : 0,
        copies: action === 'copy' ? 1 : 0,
        lastViewed: action === 'view' ? new Date().toISOString() : null,
        lastCopied: action === 'copy' ? new Date().toISOString() : null,
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
    
    if (action === 'view') {
      stats.views = (stats.views || 0) + 1;
      stats.lastViewed = new Date().toISOString();
    } else if (action === 'copy') {
      stats.copies = (stats.copies || 0) + 1;
      stats.lastCopied = new Date().toISOString();
    }

    const updateResult = await github.updateFile(
      `stats/${id}.json`,
      JSON.stringify(stats, null, 2),
      `Update ${action} count: ${id}`,
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
    console.error("Update stats error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
