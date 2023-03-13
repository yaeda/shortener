"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTask = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const buildTask = async ({ core, io, exec, require, options, }) => {
    await io.mkdirP("./_site/");
    // .nojekyll
    await exec.exec("touch ./_site/.nojekyll");
    // 404.html
    try {
        await io.cp(options.NOT_FOUND_FILE_PATH, "./_site/404.html");
    }
    catch (error) {
        core.info(error.message);
        core.notice("skip placement of 404.html");
    }
    // alias.html
    const urls = require(options.JSON_DATABASE_PATH);
    for (var i = 0; i < urls.length; i++) {
        const { url, alias } = urls[i];
        await promises_1.default.writeFile(`./_site/${alias}.html`, `<!DOCTYPE html><meta http-equiv="refresh" content="0;url=${url}">`);
    }
};
exports.buildTask = buildTask;
