"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.creationTask = void 0;
const path_1 = __importDefault(require("path"));
const comment_builder_1 = require("./comment-builder");
const issue_comment_1 = require("./issue-comment");
const pull_request_1 = require("./pull-request");
const validation_1 = require("./validation");
const creationTask = async ({ github, context, require, }, options) => {
    const payload = context.payload;
    const progress = {
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
    const validatedUrl = (0, validation_1.validateURL)(url);
    progress.passedUrlValidation = validatedUrl !== undefined;
    // alias validation and uniqueness
    const needsAliasSuggestion = alias === "_No response_";
    const validatedAlias = needsAliasSuggestion
        ? (0, validation_1.createUniqueAlias)(options.JSON_DATABASE_PATH, require)
        : (0, validation_1.validateAlias)(alias);
    if (needsAliasSuggestion) {
        progress.passedAliasValidation = true;
        progress.passedAliasUniqueness = true;
    }
    else if (validatedAlias !== undefined) {
        progress.passedAliasValidation = true;
        progress.passedAliasUniqueness = (0, validation_1.checkAliasUniqueness)(validatedAlias, options.JSON_DATABASE_PATH, require);
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
    const passedAllValidation = progress.passedUrlValidation &&
        progress.passedAliasValidation &&
        progress.passedAliasUniqueness &&
        validatedUrl !== undefined &&
        validatedAlias !== undefined;
    if (passedAllValidation) {
        // update json
        const dataList = require(options.JSON_DATABASE_PATH);
        dataList.push({ url: validatedUrl, alias: validatedAlias });
        // create & merge pull request
        progress.merged = await (0, pull_request_1.createPullRequest)({
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
    const commendBody = (0, comment_builder_1.buildCreationComment)({
        url,
        validatedUrl,
        shortUrl,
        alias,
        validatedAlias,
        replyName: payload.sender.login,
        databaseUrl: jsonDatabaseInfo.url,
        progress,
    });
    await (0, issue_comment_1.comment)({
        github,
        ...context.repo,
        issue_number: payload.issue.number,
        body: commendBody,
    });
};
exports.creationTask = creationTask;
