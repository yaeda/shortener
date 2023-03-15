"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDeletionComment = exports.buildCreationComment = exports.TITLE_FOR_DELETION = exports.TITLE_FOR_CREATION = void 0;
const INDENT = "    ";
const MARK_PASSED = ":white_check_mark:";
const MARK_FAILED = ":warning:";
const MARK_NOT_STARTED = ":pause_button:";
// const MARK_INPROGRESS = ":hourglass_flowing_sand:";
exports.TITLE_FOR_CREATION = ":robot: _creating a new short url_";
exports.TITLE_FOR_DELETION = ":robot: _deleting a short url_";
//
// ============= [success cases] =============
// :robot: _creating a new short url_
//
// - :white_check_mark: Url (**`${url}`**) is valid
// - :white_check_mark: Alias (**`${alias}`**) is valid
// - :white_check_mark: Alias (**`${alias}`**) is unique
// - :white_check_mark: Pull request is created
//
// :link: **${shortUrl} will be removed.**
//
// ============== [error cases] ==============
// :robot: _deleting a short url_
//
// - :white_check_mark: Url (**`${url}`**) is valid
// - :white_check_mark: Alias (**`${alias}`**) is valid
// - :warning: Alias (**`${alias}`**) is not unique
//     - See ${databaseUrl}.;
// - :pause_button: Pull request creation
//
// :bell: **@${reply} Please edit issue to fix above.**
//
const buildCreationComment = ({ url, validatedUrl, shortUrl, alias, validatedAlias, replyName, databaseUrl, checkProgress, }) => {
    // notice and status
    const status = [];
    if (checkProgress.passedUrlValidation) {
        status.push(`- ${MARK_PASSED} URL (**\`${validatedUrl}\`**) is valid`);
    }
    else {
        status.push(`- ${MARK_FAILED} URL (**\`${url}\`**) is not valid`);
    }
    if (checkProgress.passedAliasValidation) {
        status.push(`- ${MARK_PASSED} Alias (**\`${validatedAlias}\`**) is valid`);
    }
    else {
        status.push(`- ${MARK_FAILED} Alias (**\`${alias}\`**) is not valid`);
        status.push(`${INDENT}- Only alphanumeric characters, \`-\` and \`_\` can be used for alias.`);
    }
    if (checkProgress.passedAliasUniqueness) {
        status.push(`- ${MARK_PASSED} Alias (**\`${validatedAlias}\`**) is unique`);
    }
    else {
        if (checkProgress.passedAliasValidation) {
            status.push(`- ${MARK_FAILED} Alias (**\`${alias}\`**) is not unique`);
            status.push(`${INDENT}- See ${databaseUrl}.`);
        }
        else {
            status.push(`- ${MARK_NOT_STARTED} Alias uniqueness`);
        }
    }
    if (checkProgress.passedUrlValidation &&
        checkProgress.passedAliasValidation &&
        checkProgress.passedAliasUniqueness) {
        status.push(`- ${MARK_PASSED} Pull request is created`);
        status.push("\n");
        status.push(`:link: **${shortUrl} will point to ${validatedUrl}.**`);
    }
    else {
        status.push(`- ${MARK_NOT_STARTED} Pull request creation`);
        status.push("\n");
        status.push(`:bell: **@${replyName} Please edit issue to fix above.**`);
    }
    return [exports.TITLE_FOR_CREATION, ...status].join("\n");
};
exports.buildCreationComment = buildCreationComment;
//
// ============= [success cases] =============
// :robot: _deleting a short url_
//
// - :white_check_mark: Alias (**`${alias}`**) is found
// - :white_check_mark: Pull request is created
//
// :link: **${shortUrl} will be removed.**
//
// ============== [error cases] ==============
// :robot: _deleting a short url_
//
// - :warning: Alias (**`${alias}`**) is not found
//     - See ${databaseUrl}.;
// - :pause_button: Pull request creation
//
// :bell: **@${reply} Please edit issue to fix above.**
//
const buildDeletionComment = ({ shortUrl, alias, replyName, databaseUrl, isFound, }) => {
    // notice and status
    const status = [];
    if (isFound) {
        status.push(`- ${MARK_PASSED} Alias (**\`${alias}\`**) is found`);
        status.push(`- ${MARK_PASSED} Pull request is created`);
        status.push("\n");
        status.push(`:link: **${shortUrl} will be deleted.**`);
    }
    else {
        status.push(`- ${MARK_FAILED} Alias (**\`${alias}\`**) is not found`);
        status.push(`${INDENT}- See ${databaseUrl}.`);
        status.push(`- ${MARK_NOT_STARTED} Pull request creation`);
        status.push("\n");
        status.push(`:bell: **@${replyName} Please edit issue to fix above.**`);
    }
    return [exports.TITLE_FOR_DELETION, ...status].join("\n");
};
exports.buildDeletionComment = buildDeletionComment;
