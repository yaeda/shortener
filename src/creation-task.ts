import type { Context } from "@actions/github/lib/context";
import type { Octokit } from "@octokit/core";
import type { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import type { IssuesEvent } from "@octokit/webhooks-types";
import path from "path";
import { comment } from "./issue-comment";
import type { Options } from "./options";
import { createPullRequest } from "./pull-request";
import {
  checkAliasUniqueness,
  createUniqueAlias,
  validateAlias,
  validateURL,
} from "./validation";

type CheckProgress = {
  passedUrlValidation: boolean;
  passedAliasValidation: boolean;
  passedAliasUniqueness: boolean;
};

// build comment
const buildComment = ({
  url,
  validatedUrl,
  shortUrl,
  alias,
  validatedAlias,
  replyName,
  databaseUrl,
  checkProgress,
}: {
  url?: string;
  validatedUrl?: string;
  shortUrl?: string;
  alias?: string;
  validatedAlias?: string;
  replyName: string;
  databaseUrl: string | null;
  checkProgress: CheckProgress;
}) => {
  // pre definition
  const indent = "    ";
  const markPassed = ":white_check_mark:";
  const markFailed = ":warning:";
  const markNotStarted = ":pause_button:";
  const markInprogress = ":hourglass_flowing_sand:";

  // title
  const title = ":robot: _**creating a new short url**_";

  // notice and status
  const status: string[] = [];

  if (checkProgress.passedUrlValidation) {
    status.push(`- ${markPassed} url (**\`${validatedUrl}\`**) is valid`);
  } else {
    status.push(`- ${markFailed} url (**\`${url}\`**) is not valid`);
  }

  if (checkProgress.passedAliasValidation) {
    status.push(`- ${markPassed} alias (**\`${validatedAlias}\`**) is valid`);
  } else {
    status.push(`- ${markFailed} alias (**\`${alias}\`**) is not valid`);
    status.push(
      `${indent}- Only alphanumeric characters, \`-\` and \`_\` can be used for alias.`
    );
  }

  if (checkProgress.passedAliasUniqueness) {
    status.push(`- ${markPassed} alias (**\`${validatedAlias}\`**) is unique`);
  } else {
    if (checkProgress.passedAliasValidation) {
      status.push(`- ${markFailed} alias (**\`${alias}\`**) is not unique`);
      status.push(`${indent}- See ${databaseUrl}.`);
    } else {
      status.push(`- ${markNotStarted} alias uniqueness`);
    }
  }

  if (
    checkProgress.passedUrlValidation &&
    checkProgress.passedAliasValidation &&
    checkProgress.passedAliasUniqueness
  ) {
    status.push(`- ${markInprogress} PR review & merge`);
    status.push(`\n:link: ${shortUrl} will point to ${validatedUrl}`);
  } else {
    status.push(`- ${markNotStarted} PR review & merge`);
    status.push(`\n@${replyName} Please edit issue to fix above.`);
  }

  return [title, ...status].join("\n");
};

export const creationTask = async (
  {
    github,
    context,
    require,
  }: { github: Octokit & Api; context: Context; require: NodeRequire },
  options: Options
) => {
  const payload = context.payload as IssuesEvent;

  const checkProgress: CheckProgress = {
    passedUrlValidation: false,
    passedAliasValidation: false,
    passedAliasUniqueness: false,
  };

  if (payload.issue.body == null) {
    return;
  }

  // url and alias
  const [url, alias] = payload.issue.body
    .split(/\r\n|\n|\r/)
    .filter((line) => line.length && line[0] !== "#");

  // url validation
  const validatedUrl = validateURL(url);
  checkProgress.passedUrlValidation = validatedUrl !== undefined;

  // alias validation and uniqueness
  const needsAliasSuggestion = alias === "_No response_";
  const validatedAlias = needsAliasSuggestion
    ? createUniqueAlias(options.JSON_DATABASE_PATH, require)
    : validateAlias(alias);
  if (needsAliasSuggestion) {
    checkProgress.passedAliasValidation = true;
    checkProgress.passedAliasUniqueness = true;
  } else if (validatedAlias !== undefined) {
    checkProgress.passedAliasValidation = true;
    checkProgress.passedAliasUniqueness = checkAliasUniqueness(
      validatedAlias,
      options.JSON_DATABASE_PATH,
      require
    );
  }

  // TODO: support custom domain
  const shortUrl = `https://${context.repo.owner}.github.io/${context.repo.repo}/${validatedAlias}`;

  // json database info
  const jsonDatabaseInfo = {
    url: options.JSON_DATABASE_PATH,
    path: "",
    sha: "",
  };
  if (checkProgress.passedAliasValidation) {
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
  }

  const commendBody = buildComment({
    url,
    validatedUrl,
    shortUrl,
    alias,
    validatedAlias,
    replyName: payload.sender.login,
    databaseUrl: jsonDatabaseInfo.url,
    checkProgress,
  });

  await comment({
    github,
    ...context.repo,
    issue_number: payload.issue.number,
    body: commendBody,
  });

  const allPassed =
    checkProgress.passedUrlValidation &&
    checkProgress.passedAliasValidation &&
    checkProgress.passedAliasUniqueness;
  if (
    !allPassed ||
    validatedUrl === undefined ||
    validatedAlias === undefined
  ) {
    return;
  }

  // update json
  const dataList: {
    url: string;
    alias: string;
  }[] = require(options.JSON_DATABASE_PATH);
  dataList.push({ url: validatedUrl, alias: validatedAlias });

  // create pull request
  await createPullRequest({
    github,
    context,
    contentJson: dataList,
    contentInfo: jsonDatabaseInfo,
    branchName: `create_short_url-${payload.issue.number}-${validatedAlias}`,
    commitMessage: `:link: create a new short url (alias: ${validatedAlias})`,
    pullRequestTitle: `:link: create a new short url (alias: ${validatedAlias})`,
    pullRequestBody: `closes #${payload.issue.number}`,
  });
};
