"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.creationTask = void 0;
const path_1 = __importDefault(require("path"));
const issue_comment_1 = require("./issue-comment");
const pull_request_1 = require("./pull-request");
const validation_1 = require("./validation");
// build comment
const buildComment = ({ url, validatedUrl, shortUrl, alias, validatedAlias, replyName, databaseUrl, checkProgress, }) => {
    // pre definition
    const indent = "    ";
    const markPassed = ":white_check_mark:";
    const markFailed = ":warning:";
    const markNotStarted = ":pause_button:";
    const markInprogress = ":hourglass_flowing_sand:";
    // title
    const title = ":robot: _**creating a new short url**_";
    // notice and status
    const status = [];
    if (checkProgress.passedUrlValidation) {
        status.push(`- ${markPassed} url (**\`${validatedUrl}\`**) is valid`);
    }
    else {
        status.push(`- ${markFailed} url (**\`${url}\`**) is not valid`);
    }
    if (checkProgress.passedAliasValidation) {
        status.push(`- ${markPassed} alias (**\`${validatedAlias}\`**) is valid`);
    }
    else {
        status.push(`- ${markFailed} alias (**\`${alias}\`**) is not valid`);
        status.push(`${indent}- Only alphanumeric characters, \`-\` and \`_\` can be used for alias.`);
    }
    if (checkProgress.passedAliasUniqueness) {
        status.push(`- ${markPassed} alias (**\`${validatedAlias}\`**) is unique`);
    }
    else {
        if (checkProgress.passedAliasValidation) {
            status.push(`- ${markFailed} alias (**\`${alias}\`**) is not unique`);
            status.push(`${indent}- See ${databaseUrl}.`);
        }
        else {
            status.push(`- ${markNotStarted} alias uniqueness`);
        }
    }
    if (checkProgress.passedUrlValidation &&
        checkProgress.passedAliasValidation &&
        checkProgress.passedAliasUniqueness) {
        status.push(`- ${markInprogress} PR review & merge`);
        status.push(`\n:link: ${shortUrl} will point to ${validatedUrl}`);
    }
    else {
        status.push(`- ${markNotStarted} PR review & merge`);
        status.push(`\n@${replyName} Please edit issue to fix above.`);
    }
    return [title, ...status].join("\n");
};
const creationTask = async ({ github, context, require, }, options) => {
    const payload = context.payload;
    const checkProgress = {
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
    const validatedUrl = (0, validation_1.validateURL)(url);
    checkProgress.passedUrlValidation = validatedUrl !== undefined;
    // alias validation and uniqueness
    const needsAliasSuggestion = alias === "_No response_";
    const validatedAlias = needsAliasSuggestion
        ? (0, validation_1.createUniqueAlias)(options.JSON_DATABASE_PATH, require)
        : (0, validation_1.validateAlias)(alias);
    if (needsAliasSuggestion) {
        checkProgress.passedAliasValidation = true;
        checkProgress.passedAliasUniqueness = true;
    }
    else if (validatedAlias !== undefined) {
        checkProgress.passedAliasValidation = true;
        checkProgress.passedAliasUniqueness = (0, validation_1.checkAliasUniqueness)(validatedAlias, options.JSON_DATABASE_PATH, require);
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
                path: path_1.default.normalize(options.JSON_DATABASE_PATH),
            });
            if (!Array.isArray(data)) {
                jsonDatabaseInfo.url =
                    data.html_url !== null ? data.html_url : jsonDatabaseInfo.url;
                jsonDatabaseInfo.path = data.path;
                jsonDatabaseInfo.sha = data.sha;
            }
        }
        catch { }
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
    await (0, issue_comment_1.comment)({
        github,
        ...context.repo,
        issue_number: payload.issue.number,
        body: commendBody,
    });
    const allPassed = checkProgress.passedUrlValidation &&
        checkProgress.passedAliasValidation &&
        checkProgress.passedAliasUniqueness;
    if (!allPassed ||
        validatedUrl === undefined ||
        validatedAlias === undefined) {
        return;
    }
    // update json
    const dataList = require(options.JSON_DATABASE_PATH);
    dataList.push({ url: validatedUrl, alias: validatedAlias });
    // create pull request
    await (0, pull_request_1.createPullRequest)({
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
exports.creationTask = creationTask;
