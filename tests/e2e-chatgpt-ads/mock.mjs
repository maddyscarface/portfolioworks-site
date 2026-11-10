// Local mock for bzr.openai.com (Conversions API), bzrcdn.openai.com SDK, and Resend.
// Records every request to /tmp/mock-requests.jsonl.
import http from "node:http";
import fs from "node:fs";

const LOG = "/tmp/mock-requests.jsonl";
http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    fs.appendFileSync(LOG, JSON.stringify({ at: Date.now(), method: req.method, url: req.url, auth: req.headers.authorization, body }) + "\n");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(req.url.startsWith("/emails") ? '{"id":"email_mock"}' : '{"ok":true}');
  });
}).listen(4999, "127.0.0.1", () => console.log("mock on 4999"));
