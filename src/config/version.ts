const pkg = require("../../package.json") as { version: string; name: string };

export const appVersion = "v1";
export const appName    = pkg.name;
