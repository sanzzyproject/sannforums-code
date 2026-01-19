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
    
    if (req.method !== "DELETE") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing snippet ID" });
    }

    const github = new GitHubStorage();

    // Get SHA for all files to delete
    const [snippetSHA, codeSHA, statsSHA] = await Promise.all([
      github.getFileSHA(`snippets/${id}.json`),
      github.getFileSHA(`codes/${id}.txt`),
      github.getFileSHA(`stats/${id}.json`),
    ]);

    // Delete files
    const deletions = [];

    if (snippetSHA.success) {
      deletions.push(
        github.deleteFile(
          `snippets/${id}.json`,
          `Delete snippet: ${id}`,
          snippetSHA.sha
        )
      );
    }

    if (codeSHA.success) {
      deletions.push(
        github.deleteFile(
          `codes/${id}.txt`,
          `Delete code: ${id}`,
          codeSHA.sha
        )
      );
    }

    if (statsSHA.success) {
      deletions.push(
        github.deleteFile(
          `stats/${id}.json`,
          `Delete stats: ${id}`,
          statsSHA.sha
        )
      );
    }

    await Promise.all(deletions);

    return res.status(200).json({
      success: true,
      message: `Snippet ${id} deleted successfully`,
    });
  } catch (error) {
    if (error.message.includes("Unauthorized")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    console.error("Delete error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
