"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.creationTask = void 0;
const crypto_1 = __importDefault(require("crypto"));
const issue_comment_1 = require("./issue-comment");
// build comment
const buildComment = ({ url, validatedUrl, shortUrl, alias, validatedAlias, replyName, databaseUrl, checkProgress, }) => {
    // pre definition
    const indent = "    ";
    const markPassed = ":white_check_mark:";
    const markFailed = ":x:";
    const markNotStarted = ":heavy_minus_sign:";
    const markInprogress = ":hourglass_flowing_sand:";
    // title
    const title = "## :robot: _**creating a new short url**_";
    // notice and status
    const status = [];
    if (checkProgress.passedUrlValidation) {
        status.push(`- ${markPassed} **\`${validatedUrl}\`** is valid`);
    }
    else {
        status.push(`- ${markFailed} **\`${url}\`** is not valid`);
    }
    if (checkProgress.passedAliasValidation) {
        status.push(`- ${markPassed} **\`${validatedAlias}\`** is valid`);
    }
    else {
        status.push(`- ${markFailed} **\`${alias}\`** is not valid`);
        status.push(`${indent}- Only alphanumeric characters, \`-\` and \`_\` can be used for alias.`);
    }
    if (checkProgress.passedAliasUniqueness) {
        status.push(`- ${markPassed} **\`${validatedAlias}\`** is unique`);
    }
    else {
        if (checkProgress.passedAliasValidation) {
            status.push(`- ${markFailed} **\`${alias}\`** is not unique`);
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
        status.push(`:link: ${shortUrl} will point to ${validateURL}`);
    }
    else {
        status.push(`- ${markNotStarted} PR review & merge`);
        status.push(`\n@${replyName} Please edit issue to fix above.`);
    }
    return [title, ...status].join("\n");
};
const validateURL = (url) => {
    if (url === undefined) {
        return undefined;
    }
    try {
        return new URL(url).href;
    }
    catch {
        return undefined;
    }
};
const validateAlias = (alias) => {
    if (alias === undefined) {
        return undefined;
    }
    return /^[\w-]+$/.test(alias) ? alias : undefined;
};
const checkAliasUniqueness = (alias, jsonDatabasePath, require) => {
    const dataList = require(jsonDatabasePath);
    return dataList.findIndex((data) => data.alias === alias) < 0;
};
const createUniqueAlias = (jsonDatabasePath, require) => {
    let alias = crypto_1.default.randomBytes(4).toString("base64url");
    while (!checkAliasUniqueness(alias, jsonDatabasePath, require)) {
        alias = crypto_1.default.randomBytes(4).toString("base64url");
    }
    return alias;
};
const creationTask = async ({ github, require }, repo, payload, options) => {
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
    }
    else if (validatedAlias !== undefined) {
        checkProgress.passedAliasValidation = true;
        checkProgress.passedAliasUniqueness = checkAliasUniqueness(validatedAlias, options.JSON_DATABASE_PATH, require);
    }
    // TODO: support custom domain
    const shortUrl = `https://${repo.owner}.github.io/${repo.repo}/${validatedAlias}`;
    const { data } = await github.rest.repos.getContent({
        ...repo,
        path: options.JSON_DATABASE_PATH,
    });
    const databaseUrl = !Array.isArray(data) ? data.html_url : null;
    console.log(databaseUrl);
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
    await (0, issue_comment_1.comment)({
        github,
        ...repo,
        issue_number: payload.issue.number,
        body: commendBody,
    });
};
exports.creationTask = creationTask;
