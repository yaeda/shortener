const onPush = async ({ core, io, exec }) => {
  const JSON_DATABASE_PATH = core.getInput("json-database-path");
  const NOT_FOUND_FILE_PATH = core.getInput("not-found-file-path");
  console.log({ JSON_DATABASE_PATH, NOT_FOUND_FILE_PATH });
  await io.mkdirP("./_site/");

  // .nojekyll
  await exec.exec("touch ./_site/.nojekyll");

  // 404.html
  try {
    await io.cp(NOT_FOUND_FILE_PATH, "./_site/404.html");
  } catch (error) {
    core.info(error.message);
    core.notice("skip placement of 404.html");
  }

  // alias.html
  const fs = require("fs").promises;
  const urls = require(JSON_DATABASE_PATH);
  for (var i = 0; i < urls.length; i++) {
    const { url, alias } = urls[i];
    await fs.writeFile(
      `./_site/${alias}.html`,
      `<!DOCTYPE html><meta http-equiv="refresh" content="0;url=${url}">`
    );
  }
};

// const onIssue = (github, repo, { action, label, issue }) => {
//   switch (action) {
//     case "opened":
//     case "edited":
//       const { title, body, number } = issue;
//       const { owner, repo: name } = repo;
//       const [firstLine, secondLine, ...restLines] = body.split("\n");
//   }
// };

module.exports = async ({ github, context, core, io, exec }) => {
  switch (context.eventName) {
    case "push":
    case "workflow_dispatch":
      await onPush({ core, io, exec });
      return "success:on-push";
    // case "issues":
    //   await onIssue(github, context.repo, context.payload);
    //   return "success:on-issue";
  }
  // TODO: notice event_name information
  return "error:invalid-event_name";
};
