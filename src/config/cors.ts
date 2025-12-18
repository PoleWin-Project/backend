import cors, { CorsOptions } from "cors";
import { env } from "./env";

export const corsOptions: CorsOptions = {
    origin: env.corsOrigin,
    credentials: true,
};
