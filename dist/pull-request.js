"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPullRequest = void 0;
const createPullRequest = async ({ github, context, contentJson, contentInfo, branchName, commitMessage, pullRequestTitle, pullRequestBody, }) => {
    // create branch
    await github.rest.git.createRef({
        ...context.repo,
        ref: `refs/heads/${branchName}`,
        sha: context.sha,
    });
    // encode content
    const encodedContent = Buffer.from(JSON.stringify(contentJson, null, 2)).toString("base64");
    // update content
    await github.rest.repos.createOrUpdateFileContents({
        ...context.repo,
        path: contentInfo.path,
        message: commitMessage,
        content: encodedContent,
        branch: branchName,
        sha: contentInfo.sha,
    });
    // create pull request
    await github.rest.pulls.create({
        ...context.repo,
        head: branchName,
        base: context.ref.split("/")[2],
        title: pullRequestTitle,
        body: pullRequestBody,
    });
};
exports.createPullRequest = createPullRequest;
