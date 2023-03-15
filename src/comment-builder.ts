import type { CreationProgress } from "./creation-task";

const INDENT = "    ";
const MARK_PASSED = ":white_check_mark:";
const MARK_FAILED = ":warning:";
const MARK_NOT_STARTED = ":pause_button:";
// const MARK_INPROGRESS = ":hourglass_flowing_sand:";

export const TITLE_FOR_CREATION = ":robot: _creating a new short url_";
export const TITLE_FOR_DELETION = ":robot: _deleting a short url_";

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
export const buildCreationComment = ({
  url,
  validatedUrl,
  shortUrl,
  alias,
  validatedAlias,
  replyName,
  databaseUrl,
  progress,
}: {
  url?: string;
  validatedUrl?: string;
  shortUrl?: string;
  alias?: string;
  validatedAlias?: string;
  replyName: string;
  databaseUrl: string | null;
  progress: CreationProgress;
}) => {
  // notice and status
  const status: string[] = [];

  if (progress.passedUrlValidation) {
    status.push(`- ${MARK_PASSED} URL (**\`${validatedUrl}\`**) is valid`);
  } else {
    status.push(`- ${MARK_FAILED} URL (**\`${url}\`**) is not valid`);
  }

  if (progress.passedAliasValidation) {
    status.push(`- ${MARK_PASSED} Alias (**\`${validatedAlias}\`**) is valid`);
  } else {
    status.push(`- ${MARK_FAILED} Alias (**\`${alias}\`**) is not valid`);
    status.push(
      `${INDENT}- Only alphanumeric characters, \`-\` and \`_\` can be used for alias.`
    );
  }

  if (progress.passedAliasUniqueness) {
    status.push(`- ${MARK_PASSED} Alias (**\`${validatedAlias}\`**) is unique`);
  } else {
    if (progress.passedAliasValidation) {
      status.push(`- ${MARK_FAILED} Alias (**\`${alias}\`**) is not unique`);
      status.push(`${INDENT}- See ${databaseUrl}.`);
    } else {
      status.push(`- ${MARK_NOT_STARTED} Alias uniqueness`);
    }
  }

  if (
    progress.passedUrlValidation &&
    progress.passedAliasValidation &&
    progress.passedAliasUniqueness
  ) {
    if (progress.merged) {
      status.push(`- ${MARK_PASSED} Pull request is created and merged`);
      status.push("\n");
      status.push(`:link: **${shortUrl} will point to ${validatedUrl}.**`);
    } else {
      status.push(`- ${MARK_PASSED} Pull request is created`);
      status.push("\n");
      status.push(
        `:link: **${shortUrl} will point to ${validatedUrl} after PR is merged.**`
      );
    }
  } else {
    status.push(`- ${MARK_NOT_STARTED} Pull request creation`);
    status.push("\n");
    status.push(`:bell: **@${replyName} Please edit issue to fix above.**`);
  }

  return [TITLE_FOR_CREATION, ...status].join("\n");
};

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
export const buildDeletionComment = ({
  shortUrl,
  alias,
  replyName,
  databaseUrl,
  isFound,
}: {
  alias?: string;
  shortUrl?: string;
  replyName: string;
  databaseUrl: string | null;
  isFound: boolean;
}) => {
  // notice and status
  const status: string[] = [];

  if (isFound) {
    status.push(`- ${MARK_PASSED} Alias (**\`${alias}\`**) is found`);
    status.push(`- ${MARK_PASSED} Pull request is created`);
    status.push("\n");
    status.push(`:link: **${shortUrl} will be deleted.**`);
  } else {
    status.push(`- ${MARK_FAILED} Alias (**\`${alias}\`**) is not found`);
    status.push(`${INDENT}- See ${databaseUrl}.`);
    status.push(`- ${MARK_NOT_STARTED} Pull request creation`);
    status.push("\n");
    status.push(`:bell: **@${replyName} Please edit issue to fix above.**`);
  }

  return [TITLE_FOR_DELETION, ...status].join("\n");
};
