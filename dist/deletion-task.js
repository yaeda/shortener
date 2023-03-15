"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletionTask = void 0;
const path_1 = __importDefault(require("path"));
const comment_builder_1 = require("./comment-builder");
const issue_comment_1 = require("./issue-comment");
const pull_request_1 = require("./pull-request");
const validation_1 = require("./validation");
const deletionTask = async ({ github, context, require, }, options) => {
    const payload = context.payload;
    if (payload.issue.body == null) {
        return;
    }
    // extract alias
    const [alias] = payload.issue.body
        .split(/\r\n|\n|\r/)
        .filter((line) => line.length && line[0] !== "#");
    // exist or not
    const isFound = !(0, validation_1.checkAliasUniqueness)(alias, options.JSON_DATABASE_PATH, require);
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
    const commendBody = (0, comment_builder_1.buildDeletionComment)({
        shortUrl,
        alias,
        replyName: payload.sender.login,
        databaseUrl: jsonDatabaseInfo.url,
        isFound,
    });
    await (0, issue_comment_1.comment)({
        github,
        ...context.repo,
        issue_number: payload.issue.number,
        body: commendBody,
    });
    if (!isFound) {
        return;
    }
    // update json
    const dataList = require(options.JSON_DATABASE_PATH);
    const findIndex = dataList.findIndex((data) => data.alias === alias);
    dataList.splice(findIndex, 1);
    // create pull request
    await (0, pull_request_1.createPullRequest)({
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
exports.deletionTask = deletionTask;
