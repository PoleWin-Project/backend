import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { swagger } from "./config/swagger";
import usersRoutes from "./modules/users/users.routes";
import authRoutes from "./modules/auth/auth.routes";
import { errorHandler } from "./common/middleware/errorHandler";

export function createApp() {
	const app = express();

	app.use(cors({ origin: env.corsOrigin, credentials: true }));
	app.use(express.json());

	app.get("/", (_req, res) => {
		res.status(200).type("html").send(`
			<!doctype html>
			<html lang="fr">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>PoleWin API</title>
				<style>
				body{font-family:system-ui;margin:40px;line-height:1.5}
				code{background:#f3f3f3;padding:2px 6px;border-radius:6px}
				a{color:#2563eb;text-decoration:none}
				a:hover{text-decoration:underline}
				.card{max-width:720px;border:1px solid #e5e7eb;border-radius:16px;padding:20px}
				ul{padding-left:18px}
				</style>
			</head>
			<body>
				<div class="card">
				<h1>PoleWin API</h1>
				<p>Backend Express + TypeScript</p>
				<ul>
					<li>Swagger: <a href="/api/docs">/api/docs</a></li>
					<li>Health: <a href="/api/health">/api/health</a></li>
					<li>Users me: <code>GET /api/users/me</code></li>
				</ul>
				</div>
			</body>
			</html>
		`);
	});

	app.use("/api/docs", swagger.serve, swagger.setup);

	app.use("/api", usersRoutes);
	app.use("/api", authRoutes);

	app.use(errorHandler);

	return app;
}
