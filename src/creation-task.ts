import type { Context } from "@actions/github/lib/context";
import type { Octokit } from "@octokit/core";
import type { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import type { IssuesEvent } from "@octokit/webhooks-types";
import path from "path";
import { buildCreationComment } from "./comment-builder";
import { comment } from "./issue-comment";
import type { Options } from "./options";
import { createPullRequest } from "./pull-request";
import {
  checkAliasUniqueness,
  createUniqueAlias,
  validateAlias,
  validateURL,
} from "./validation";

export type CreationProgress = {
  passedUrlValidation: boolean;
  passedAliasValidation: boolean;
  passedAliasUniqueness: boolean;
  merged: boolean;
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

  const progress: CreationProgress = {
    passedUrlValidation: false,
    passedAliasValidation: false,
    passedAliasUniqueness: false,
    merged: false,
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
  progress.passedUrlValidation = validatedUrl !== undefined;

  // alias validation and uniqueness
  const needsAliasSuggestion = alias === "_No response_";
  const validatedAlias = needsAliasSuggestion
    ? createUniqueAlias(options.JSON_DATABASE_PATH, require)
    : validateAlias(alias);
  if (needsAliasSuggestion) {
    progress.passedAliasValidation = true;
    progress.passedAliasUniqueness = true;
  } else if (validatedAlias !== undefined) {
    progress.passedAliasValidation = true;
    progress.passedAliasUniqueness = checkAliasUniqueness(
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
  if (progress.passedAliasValidation) {
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

  const passedAllValidation =
    progress.passedUrlValidation &&
    progress.passedAliasValidation &&
    progress.passedAliasUniqueness &&
    validatedUrl !== undefined &&
    validatedAlias !== undefined;

  if (passedAllValidation) {
    // update json
    const dataList: {
      url: string;
      alias: string;
    }[] = require(options.JSON_DATABASE_PATH);
    dataList.push({ url: validatedUrl, alias: validatedAlias });

    // create & merge pull request
    progress.merged = await createPullRequest({
      github,
      context,
      contentJson: dataList,
      contentInfo: jsonDatabaseInfo,
      branchName: `create_short_url-${payload.issue.number}-${validatedAlias}`,
      commitMessage: `:link: create a new short url (alias: ${validatedAlias})`,
      pullRequestTitle: `:link: create a new short url (alias: ${validatedAlias})`,
      pullRequestBody: `closes #${payload.issue.number}`,
    });
  }

  // comment issue
  const commendBody = buildCreationComment({
    url,
    validatedUrl,
    shortUrl,
    alias,
    validatedAlias,
    replyName: payload.sender.login,
    databaseUrl: jsonDatabaseInfo.url,
    progress,
  });

  await comment({
    github,
    ...context.repo,
    issue_number: payload.issue.number,
    body: commendBody,
  });
};
