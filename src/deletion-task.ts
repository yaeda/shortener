import type { Context } from "@actions/github/lib/context";
import type { Octokit } from "@octokit/core";
import type { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import type { IssuesEvent } from "@octokit/webhooks-types";
import path from "path";
import { buildDeletionComment } from "./comment-builder";
import { comment } from "./issue-comment";
import type { Options } from "./options";
import { createPullRequest } from "./pull-request";
import { checkAliasUniqueness } from "./validation";

export const deletionTask = async (
  {
    github,
    context,
    require,
  }: { github: Octokit & Api; context: Context; require: NodeRequire },
  options: Options
) => {
  const payload = context.payload as IssuesEvent;
  if (payload.issue.body == null) {
    return;
  }

  // extract alias
  const [alias] = payload.issue.body
    .split(/\r\n|\n|\r/)
    .filter((line) => line.length && line[0] !== "#");

  // exist or not
  const isFound = !checkAliasUniqueness(
    alias,
    options.JSON_DATABASE_PATH,
    require
  );

  // TODO: support custom domain
  const shortUrl = `https://${context.repo.owner}.github.io/${context.repo.repo}/${alias}`;

  // json database info
  const jsonDatabaseInfo = {
    url: options.JSON_DATABASE_PATH,
    path: "",
    sha: "",
  };
  try {
    const { data } = await github.rest.repos.getContent({
      ...context.repo,
      path: path.normalize(options.JSON_DATABASE_PATH),
    });
    if (!Array.isArray(data)) {
      jsonDatabaseInfo.url =
        data.html_url !== null ? data.html_url : jsonDatabaseInfo.url;
      jsonDatabaseInfo.path = data.path;
      jsonDatabaseInfo.sha = data.sha;
    }
  } catch {}

  const commendBody = buildDeletionComment({
    shortUrl,
    alias,
    replyName: payload.sender.login,
    databaseUrl: jsonDatabaseInfo.url,
    isFound,
  });

  await comment({
    github,
    ...context.repo,
    issue_number: payload.issue.number,
    body: commendBody,
  });

  if (!isFound) {
    return;
  }

  // update json
  const dataList: {
    url: string;
    alias: string;
  }[] = require(options.JSON_DATABASE_PATH);
  const findIndex = dataList.findIndex((data) => data.alias === alias);
  dataList.splice(findIndex, 1);

  // create pull request
  await createPullRequest({
    github,
    context,
    contentJson: dataList,
    contentInfo: jsonDatabaseInfo,
    branchName: `delete_short_url-${payload.issue.number}-${alias}`,
    commitMessage: `:fire: delete a short url (alias: ${alias})`,
    pullRequestTitle: `:fire: delete a short url (alias: ${alias})`,
    pullRequestBody: `closes #${payload.issue.number}`,
  });
};
