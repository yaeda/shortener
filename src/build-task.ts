import type * as _core from "@actions/core";
import type * as _exec from "@actions/exec";
import type * as _io from "@actions/io";
import fs from "fs/promises";
import type { Options } from "./options";

export const buildTask = async ({
  core,
  io,
  exec,
  require,
  options,
}: {
  core: typeof _core;
  io: typeof _io;
  exec: typeof _exec;
  require: NodeRequire;
  options: Options;
}) => {
  await io.mkdirP("./_site/");

  // .nojekyll
  await exec.exec("touch ./_site/.nojekyll");

  // 404.html
  try {
    await io.cp(options.NOT_FOUND_FILE_PATH, "./_site/404.html");
  } catch (error: any) {
    core.info(error.message);
    core.notice("skip placement of 404.html");
  }

  // alias.html
  const urls = require(options.JSON_DATABASE_PATH);
  for (var i = 0; i < urls.length; i++) {
    const { url, alias } = urls[i];
    await fs.writeFile(
      `./_site/${alias}.html`,
      `<!DOCTYPE html><meta http-equiv="refresh" content="0;url=${url}">`
    );
  }
};
