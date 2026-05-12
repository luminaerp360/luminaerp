const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 8080;

// Health check endpoint (must be before catch-all route)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, "dist/DasaDovePos/browser")));

// Handle Angular routing (catch-all route must be last)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/DasaDovePos/browser/index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
