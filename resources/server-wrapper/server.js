const http = require("http");
const fs = require("fs");
const path = require("path");
const { lookup } = require("mime-types");

const headers = new Set();
headers.add("Cross-Origin-Opener-Policy", "same-origin");
headers.add("Cross-Origin-Embedder-Policy", "require-corp");

const pathToServe = path.join(__dirname, "..", "build");

const server = http.createServer((req, res) => {
  // if req.url is /, serve index.html
  let reqURL = req.url;
  if (req.url === "/") {
    reqURL = "/index.html";
  }

  const filePath = pathToServe + reqURL;
  const extname = path.extname(filePath);
  const contentType = lookup(extname) || "text/plain";

  fs.readFile(filePath, (err, data) => {
    console.log(`Request for ${filePath} received`);
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
    } else {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");

      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    }
  });
});

if (!process.env.PORT) {
  throw new Error("PORT environment variable not set");
}

server.listen(Number(process.env.PORT), () => {
  console.log(`Server running at PORT ${process.env.PORT}`);
});
