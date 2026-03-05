const pkg = require("../../package.json") as { version: string; name: string };

export const appVersion = pkg.version;
export const appName    = pkg.name;
