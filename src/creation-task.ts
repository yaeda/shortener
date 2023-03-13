import type { Octokit } from "@octokit/core";
import type { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import crypto from "crypto";
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
  shortUrl,
  alias,
  replyName,
  checkProgress,
  options,
}: {
  url?: string;
  shortUrl?: string;
  alias?: string;
  replyName: string;
  checkProgress: CheckProgress;
  options: Options;
}) => {
  // pre definition
  const indent = "    ";
  const markPassed = ":white_check_mark:";
  const markFailed = ":x:";
  const markNotStarted = ":heavy_minus_sign:";
  const markInprogress = ":hourglass_flowing_sand:";

  // title
  const title = ":robot: _**creating a new short url**_";

  // notice and status
  const notice: string[] = [];
  const status: string[] = ["## Status"];

  if (!checkProgress.passedUrlValidation) {
    notice.push(`- :warning: **\`${url}\`** is not valid.`);
    status.push(`- ${markFailed} url validation`);
  } else {
    status.push(`- ${markPassed} url validation`);
  }

  if (!checkProgress.passedAliasValidation) {
    notice.push(`- :warning: **\`${alias}\`** is not valid.`);
    notice.push(
      `${indent}- Only alphanumeric characters, \`-\` and \`_\` can be used for alias.`
    );
    status.push(`- ${markFailed} alias validation`);
  } else {
    status.push(`- ${markPassed} alias validation`);
  }

  if (!checkProgress.passedAliasUniqueness) {
    // TODO: use url instead of relative path
    notice.push(`- :warning: **\`${alias}\`** is not unique.`);
    notice.push(`${indent}- See ${options.JSON_DATABASE_PATH}.`);
    if (checkProgress.passedAliasValidation) {
      status.push(`- ${markFailed} alias uniqueness`);
    } else {
      status.push(`- ${markNotStarted} alias uniqueness`);
    }
  } else {
    if (checkProgress.passedAliasValidation) {
      status.push(`- ${markPassed} alias uniqueness`);
    } else {
      status.push(`- ${markNotStarted} alias uniqueness`);
    }
  }

  if (
    checkProgress.passedUrlValidation &&
    checkProgress.passedAliasValidation &&
    checkProgress.passedAliasUniqueness
  ) {
    notice.push(`:link: ${shortUrl} will point to ${url}`);
    status.push(`- ${markInprogress} PR review & merge`);
  } else {
    notice.push(`\n@${replyName} Please edit issue to fix above.`);
    status.push(`- ${markNotStarted} PR review & merge`);
  }

  return [title, ...notice, ...status].join("\n");
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
  repo,
  { issue, sender },
  options: Options
) => {
  const checkProgress: CheckProgress = {
    passedUrlValidation: false,
    passedAliasValidation: false,
    passedAliasUniqueness: false,
  };

  // url and alias
  const [url, alias] = issue.body
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

  // TODO: enable custom domain
  const shortUrl = `https://${repo.owner}.github.io/${repo.repo}/${validatedUrl}`;
  const commendBody = buildComment({
    url: validatedUrl,
    shortUrl,
    alias: validatedAlias,
    replyName: sender.name,
    checkProgress,
    options,
  });

  await comment({
    github,
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issue.number,
    body: commendBody,
  });
};
