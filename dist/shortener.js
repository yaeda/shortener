"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const onPush = async ({ core, io, exec, require, options }) => {
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
    const fs = require("fs").promises;
    const urls = require(options.JSON_DATABASE_PATH);
    for (var i = 0; i < urls.length; i++) {
        const { url, alias } = urls[i];
        await fs.writeFile(`./_site/${alias}.html`, `<!DOCTYPE html><meta http-equiv="refresh" content="0;url=${url}">`);
    }
};
// build comment
// const COMMENT_TITLE_CREATE = `:robot: _**creating a new short url**_`;
// const COMMENT_TITLE_REMOVE = `:robot: _**removing a short url**_`;
// const buildComment = ({
//   url,
//   shortUrl,
//   alias,
//   step,
// }: {
//   url: string;
//   shortUrl: string;
//   alias: string;
//   step: "alias-not-valid" | "alias-not-unique" | "alias-ok";
// }) => {
//   const title = COMMENT_TITLE_CREATE;
//   switch (step) {
//     case "alias-not-valid": {
//       const notice = `
//       :warning: **\`${alias}\`** is not a valid alias.\n
//       Only alphanumeric characters, \`-\` and \`_\` can be used for alias.
//       @yaeda Please edit issue to fix it.
//       `;
//       const status = `
//       ## Status
//       - :x: alias character validation
//       - :heavy_minus_sign: alias uniquness
//       - :heavy_minus_sign: PR review & merge
//       `;
//       return [title, notice, status].join("\n");
//     }
//     case "alias-not-unique": {
//       const notice = `:warning: **\`${alias}\`** is already used.\n
//       @yaeda Please edit issue to use another one.`;
//       const status = `
//       ## Status
//       - :white_check_mark: alias character validation
//       - :x: alias uniquness
//       - :heavy_minus_sign: PR review & merge
//       `;
//       return [title, notice, status].join("\n");
//     }
//     case "alias-ok":
//     default: {
//       const notice = `:link: ${shortUrl} will point to ${url}`;
//       const status = `
//       ## Status
//       - :white_check_mark: alias character validation
//       - :white_check_mark: alias uniquness
//       - :hourglass_flowing_sand: PR review & merge
//       `;
//       return [title, notice, status].join("\n");
//     }
//   }
// };
// add or update issue comment
// const comment = async ({
//   github,
//   owner,
//   repo,
//   issue_number,
//   body,
// }: {
//   github: Octokit & Api;
//   owner: string;
//   repo: string;
//   issue_number: number;
//   body: string;
// }) => {
//   const comments = (
//     await github.rest.issues.listComments({
//       owner,
//       repo,
//       issue_number,
//     })
//   ).data;
//   const comment = comments.find((c) =>
//     c.body?.startsWith(COMMENT_TITLE_CREATE)
//   );
//   if (comment === undefined) {
//     await github.rest.issues.createComment({ owner, repo, issue_number, body });
//   } else {
//     await github.rest.issues.updateComment({
//       owner,
//       repo,
//       comment_id: comment.id,
//       body,
//     });
//   }
// };
const onIssue = (github, repo, { action, label, issue, sender }) => {
    console.log({ action });
    if (action !== "opened" && action !== "edited") {
        return;
    }
    // url and alias
    const [url, alias] = issue.body
        .split(/\r\n|\n|\r/)
        .filter((line) => line.length && line[0] !== "#");
    // alias validation
    if (alias === "_No response_") {
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
    }
    else {
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
        }
        else {
            github.rest.issues.createComment({
                owner: repo.owner,
                repo: repo.repo,
                issue_number: issue.number,
                body: `:information_source: ${url} -> https://${repo.owner}.github.io/${repo.repo}/${alias}`,
            });
        }
    }
};
module.exports = async ({ github, context, core, io, exec, require, options, }) => {
    switch (context.eventName) {
        case "push":
        case "workflow_dispatch":
            await onPush({ core, io, exec, require, options });
            return "success:on-push";
        case "issues":
            const { action, label, issue, sender } = context.payload;
            onIssue(github, context.repo, { action, label, issue, sender });
            return "success:on-issue";
    }
    core.warning("yaeda/shortener supports only `push`, `workflow_dispatch` and `issues` events");
    return "error:invalid-event_name";
};
