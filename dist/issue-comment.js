"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.comment = void 0;
const comment_builder_1 = require("./comment-builder");
// add or update issue comment
const comment = async ({ github, owner, repo, issue_number, body, }) => {
    const previousComment = (await github.rest.issues.listComments({
        owner,
        repo,
        issue_number,
    })).data.find((comment) => comment.body?.startsWith(comment_builder_1.TITLE_FOR_CREATION) ||
        comment.body?.startsWith(comment_builder_1.TITLE_FOR_DELETION));
    if (previousComment === undefined) {
        await github.rest.issues.createComment({ owner, repo, issue_number, body });
    }
    else {
        await github.rest.issues.updateComment({
            owner,
            repo,
            comment_id: previousComment.id,
            body,
        });
    }
};
exports.comment = comment;
