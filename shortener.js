const onPush = async ({ core, io, exec, require, options }) => {
  await io.mkdirP("./_site/");

  // .nojekyll
  await exec.exec("touch ./_site/.nojekyll");

  // 404.html
  try {
    await io.cp(options.NOT_FOUND_FILE_PATH, "./_site/404.html");
  } catch (error) {
    core.info(error.message);
    core.notice("skip placement of 404.html");
  }

  // alias.html
  const fs = require("fs").promises;
  const urls = require(options.JSON_DATABASE_PATH);
  for (var i = 0; i < urls.length; i++) {
    const { url, alias } = urls[i];
    await fs.writeFile(
      `./_site/${alias}.html`,
      `<!DOCTYPE html><meta http-equiv="refresh" content="0;url=${url}">`
    );
  }
};

const onIssue = (github, repo, { action, label, issue, sender }) => {
  console.log({ action });
  if (action !== "opened" && action !== "edited") {
    return;
  }

  // url and alias
  const [url, alias] = issue.body
    .split("\n")
    .filter((line) => line.length && line[0] !== "#");

  console.log(issue.body);
  console.log({ url, alias });

  // alias validation
  if (alias === "_No respnse_") {
    // create suggestion
    const crypto = require("crypto");
    const suggestion = crypto
      .randomBytes(4)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/\=/g, "");
    github.rest.issues.createComment({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: issue.number,
      body: `:information_source: ${url} -> https://${repo.owner}.github.io/${repo.name}/${suggestion}`,
    });
  } else {
    const isValid = /^[\w-]+$/.test(alias);
    if (!isValid) {
      github.rest.issues.createComment({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: issue.number,
        body: `:warning: **${alias}** is not valid.\n
        Only alphanumeric characters, \`-\` and \`_\` can be used for alias.\n
        @${sender.name} Please edit issue to fix it.`,
      });
    } else {
      github.rest.issues.createComment({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: issue.number,
        body: `:information_source: ${url} -> https://${repo.owner}.github.io/${repo.repo}/${alias}`,
      });
    }
  }
};

module.exports = async ({
  github,
  context,
  core,
  io,
  exec,
  require,
  options,
}) => {
  switch (context.eventName) {
    case "push":
    case "workflow_dispatch":
      await onPush({ core, io, exec, require, options });
      return "success:on-push";
    case "issues":
      await onIssue(github, context.repo, context.payload);
      return "success:on-issue";
  }

  core.warning(
    "yaeda/shortener supports only `push`, `workflow_dispatch` and `issues` events"
  );
  return "error:invalid-event_name";
};
