import { Octokit } from "@octokit/rest";

class GitHubStorage {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    this.owner = process.env.GITHUB_OWNER;
    this.repo = process.env.GITHUB_REPO;
  }

  async createFile(path, content, message) {
    try {
      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message: message || `Create ${path}`,
        content: Buffer.from(content).toString("base64"),
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error creating file:", error);
      return { success: false, error: error.message };
    }
  }

  async updateFile(path, content, message, sha) {
    try {
      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message: message || `Update ${path}`,
        content: Buffer.from(content).toString("base64"),
        sha,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error updating file:", error);
      return { success: false, error: error.message };
    }
  }

  async deleteFile(path, message, sha) {
    try {
      const response = await this.octokit.repos.deleteFile({
        owner: this.owner,
        repo: this.repo,
        path,
        message: message || `Delete ${path}`,
        sha,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error deleting file:", error);
      return { success: false, error: error.message };
    }
  }

  async getFile(path) {
    try {
      const response = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });

      if (response.data.type === "file") {
        const content = Buffer.from(response.data.content, "base64").toString(
          "utf-8"
        );
        return { success: true, data: content, sha: response.data.sha };
      }

      return { success: false, error: "Path is not a file" };
    } catch (error) {
      if (error.status === 404) {
        return { success: false, error: "File not found", status: 404 };
      }
      console.error("Error getting file:", error);
      return { success: false, error: error.message };
    }
  }

  async getFileSHA(path) {
    try {
      const response = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });

      if (response.data.type === "file") {
        return { success: true, sha: response.data.sha };
      }

      return { success: false, error: "Path is not a file" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default GitHubStorage;
