import type { Octokit } from "@octokit/core";
import type { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";

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
  const [firstLine] = body.split(/\r\n|\n|\r/);
  const previousComment =
    firstLine.length !== 0
      ? (
          await github.rest.issues.listComments({
            owner,
            repo,
            issue_number,
          })
        ).data.find((comment) => comment.body?.startsWith(firstLine))
      : undefined;

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
