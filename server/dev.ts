import { app } from "./server";
import { createServer as createViteServer } from "vite";

async function startDevServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  
  app.use(vite.middlewares);
  
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PIPE ICE CREAM Dev Server] Running on http://localhost:${PORT}`);
  });
}

startDevServer();
