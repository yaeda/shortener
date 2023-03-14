"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletionTask = void 0;
const path_1 = __importDefault(require("path"));
const issue_comment_1 = require("./issue-comment");
const pull_request_1 = require("./pull-request");
const validation_1 = require("./validation");
// build comment
const buildComment = ({ shortUrl, alias, replyName, databaseUrl, isFound, }) => {
    //
    // ============= [success cases] =============
    // :robot: _**deleting a short url**_
    //
    // - :white_check_mark: alias (**`${alias}`**) is found
    // - :hourglass_flowing_sand: pull request review & marge
    //
    // :link: ${shortUrl} will be deleted
    //
    // ============== [error cases] ==============
    // :robot: _**deleting a short url**_
    //
    // - :warning: alias (**`${alias}`**) is not found
    //     - See ${databaseUrl}.;
    // - :pause_button: pull request review & marge
    //
    // :bell: @${reply} Please edit issue to fix above.
    //
    // pre definition
    const indent = "    ";
    const markPassed = ":white_check_mark:";
    const markFailed = ":warning:";
    const markNotStarted = ":pause_button:";
    const markInprogress = ":hourglass_flowing_sand:";
    // title
    const title = ":robot: _**deleting a short url**_";
    // notice and status
    const status = [];
    if (isFound) {
        status.push(`- ${markPassed} alias (**\`${alias}\`**) is found`);
        status.push(`- ${markInprogress} pull request review & merge`);
        status.push("\n");
        status.push(`:link: ${shortUrl} will be removed`);
    }
    else {
        status.push(`- ${markFailed} alias (**\`${alias}\`**) is not found`);
        status.push(`${indent}- See ${databaseUrl}.`);
        status.push(`- ${markNotStarted} pull request review & merge`);
        status.push("\n");
        status.push(`:bell:@${replyName} Please edit issue to fix above.`);
    }
    return [title, ...status].join("\n");
};
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
    const commendBody = buildComment({
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
