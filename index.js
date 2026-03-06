require("dotenv").config();
const http = require("http");

console.log("🚀 ARQUIVO INICIOU");

const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Web OK na porta ${PORT}`);
  });

setInterval(() => {
  console.log("⏱️ processo vivo");
}, 15000);