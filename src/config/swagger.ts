import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

export const swaggerDocument = YAML.load("./swagger.yaml");

const autoAuthJs = `
window.addEventListener('load', function () {
    var origFetch = window.fetch;
    window.fetch = function (url, opts) {
        var result = origFetch.apply(this, arguments);
        if (typeof url === 'string' && (url.includes('/auth/login') || url.includes('/auth/register'))) {
            result.then(function (res) {
                res.clone().json().then(function (data) {
                    if (data && data.accessToken && window.ui) {
                        window.ui.authActions.authorize({
                            bearerAuth: {
                                name: 'bearerAuth',
                                schema: { type: 'http', in: 'header', scheme: 'bearer', bearerFormat: 'JWT' },
                                value: data.accessToken,
                            }
                        });
                    }
                }).catch(function () {});
            }).catch(function () {});
        }
        return result;
    };
});
`;

const swaggerOpts: any = {
    explorer: true,
    customSiteTitle: "PoleWin API Docs",
    customJsStr: autoAuthJs,
};

export const swagger = {
    serve: swaggerUi.serve,
    setup: swaggerUi.setup(swaggerDocument, swaggerOpts),
};
