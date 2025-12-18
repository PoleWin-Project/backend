import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

export const swaggerDocument = YAML.load("./swagger.yaml");

export const swagger = {
    serve: swaggerUi.serve,
    setup: swaggerUi.setup(swaggerDocument, {
        explorer: true,
        customSiteTitle: "PoleWin API Docs",
    }),
};
