import type { Octokit } from "@octokit/core";
import type { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import { TITLE_FOR_CREATION, TITLE_FOR_DELETION } from "./comment-builder";

// add or update issue comment
export const comment = async ({
  github,
  owner,
  repo,
  issue_number,
  body,
}: {
  github: Octokit & Api;
  owner: string;
  repo: string;
  issue_number: number;
  body: string;
}) => {
  const previousComment = (
    await github.rest.issues.listComments({
      owner,
      repo,
      issue_number,
    })
  ).data.find(
    (comment) =>
      comment.body?.startsWith(TITLE_FOR_CREATION) ||
      comment.body?.startsWith(TITLE_FOR_DELETION)
  );

  if (previousComment === undefined) {
    await github.rest.issues.createComment({ owner, repo, issue_number, body });
  } else {
    await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: previousComment.id,
      body,
    });
  }
};
