import type { Octokit } from "@octokit/core";
import type { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import type { IssuesEvent } from "@octokit/webhooks-types";
import crypto from "crypto";
import path from "path";
import { comment } from "./issue-comment";
import type { Options } from "./options";

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

const validateURL = (url?: string) => {
  if (url === undefined) {
    return undefined;
  }
  try {
    return new URL(url).href;
  } catch {
    return undefined;
  }
};

const validateAlias = (alias?: string) => {
  if (alias === undefined) {
    return undefined;
  }
  return /^[\w-]+$/.test(alias) ? alias : undefined;
};

const checkAliasUniqueness = (
  alias: string,
  jsonDatabasePath: string,
  require: NodeRequire
) => {
  const dataList: { url: string; alias: string }[] = require(jsonDatabasePath);
  return dataList.findIndex((data) => data.alias === alias) < 0;
};

const createUniqueAlias = (jsonDatabasePath: string, require: NodeRequire) => {
  let alias = crypto.randomBytes(4).toString("base64url");
  while (!checkAliasUniqueness(alias, jsonDatabasePath, require)) {
    alias = crypto.randomBytes(4).toString("base64url");
  }
  return alias;
};

export const creationTask = async (
  { github, require }: { github: Octokit & Api; require: NodeRequire },
  repo: { owner: string; repo: string },
  payload: IssuesEvent,
  options: Options
): Promise<{ url: string; alias: string } | undefined> => {
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
  const shortUrl = `https://${repo.owner}.github.io/${repo.repo}/${validatedAlias}`;

  // database URL
  var databaseUrl = options.JSON_DATABASE_PATH;
  if (
    checkProgress.passedAliasValidation &&
    !checkProgress.passedAliasUniqueness
  ) {
    try {
      const { data } = await github.rest.repos.getContent({
        ...repo,
        path: path.normalize(options.JSON_DATABASE_PATH),
      });
      if (!Array.isArray(data) && data.html_url !== null) {
        databaseUrl = data.html_url;
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
    databaseUrl,
    checkProgress,
  });
  await comment({
    github,
    ...repo,
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

  const response = await github.rest.repos.createOrUpdateFileContents({
    ...repo,
    path: options.JSON_DATABASE_PATH,
    message: ":link: create a new short url",
    content: JSON.stringify(dataList, null, 2),
    branch: `create_short_url-${validatedAlias}`,
  });

  console.log(response);
};
