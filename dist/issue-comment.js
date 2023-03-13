"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.comment = void 0;
// add or update issue comment
const comment = async ({ github, owner, repo, issue_number, body, }) => {
    const [firstLine] = body.split(/\r\n|\n|\r/);
    const previousComment = firstLine.length !== 0
        ? (await github.rest.issues.listComments({
            owner,
            repo,
            issue_number,
        })).data.find((comment) => comment.body?.startsWith(firstLine))
        : undefined;
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
