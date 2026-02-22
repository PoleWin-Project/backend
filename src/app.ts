import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { swagger } from "./config/swagger";
import usersRoutes from "./modules/users/users.routes";
import authRoutes from "./modules/auth/auth.routes";
import healthRoutes from "./modules/health/health.routes";
import { errorHandler } from "./common/middleware/errorHandler";
import { notFound } from "./common/middleware/notFound";
import { jwtAuth } from "./common/middleware/jwtAuth";
import { apiLimiter } from "./common/middleware/rateLimiter";
import { landingHtml } from "./views/landing";
import { landingScript } from "./views/landing/script";
import { rootLinks } from "./common/utils/hateoas";

const API_V1 = "/api/v1";

export function createApp() {
	const app = express();

	app.use(helmet({
		contentSecurityPolicy: {
			directives: {
				...helmet.contentSecurityPolicy.getDefaultDirectives(),
				"frame-src": ["'self'", "https://www.youtube-nocookie.com"],
			},
		},
	}));
	app.use(cors({ origin: env.corsOrigin, credentials: true }));
	app.use(express.json());
	app.use(pinoHttp({ logger }));
	app.use(jwtAuth);

	app.get("/", (_req, res) => {
		res.status(200).type("html").send(landingHtml());
	});

	app.get("/landing.js", (_req, res) => {
		res.type("application/javascript").send(landingScript());
	});

	app.get("/api", (_req, res) => {
		res.json({ _links: { v1: { href: "/api/v1", method: "GET" } } });
	});

	app.get(API_V1, (_req, res) => {
		res.json({ _links: rootLinks });
	});

	app.use(`${API_V1}/docs`, swagger.serve, swagger.setup);

	app.use(API_V1, apiLimiter);

	app.use(API_V1, healthRoutes);
	app.use(API_V1, usersRoutes);
	app.use(API_V1, authRoutes);

	app.use(notFound);
	app.use(errorHandler);

	return app;
}
