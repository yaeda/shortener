import type * as _core from "@actions/core";
import type * as _exec from "@actions/exec";
import type { Context } from "@actions/github/lib/context";
import type * as _io from "@actions/io";
import type { Octokit } from "@octokit/core";
import type { PaginateInterface } from "@octokit/plugin-paginate-rest";
import type { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import type { IssuesEvent } from "@octokit/webhooks-types";
import { buildTask } from "./build-task";
import { creationTask } from "./creation-task";
import type { Options } from "./options";

module.exports = async ({
  github,
  context,
  core,
  io,
  exec,
  require,
  options,
}: {
  github: Octokit &
    Api & {
      paginate: PaginateInterface;
    };
  context: Context;
  core: typeof _core;
  io: typeof _io;
  exec: typeof _exec;
  require: NodeRequire;
  options: Options;
}) => {
  // console.log("=== print context ===");
  // console.log(context);
  // console.log("=====================");
  switch (context.eventName) {
    case "push":
    case "workflow_dispatch":
      await buildTask({ core, io, exec, require, options });
      return "success:on-push";
    case "issues":
      const payload = context.payload as IssuesEvent;
      payload.repository.html_url;
      const { action, issue, sender } = payload;
      console.log(action);
      console.log(issue.labels);
      if (action === "opened" || action === "edited") {
        creationTask(
          { github, require },
          context.repo,
          context.payload as IssuesEvent,
          options
        );
        return "success:on-issue";
      }
      return "error:on-issue";
  }

  core.warning(
    "yaeda/shortener supports only `push`, `workflow_dispatch` and `issues` events"
  );
  return "error:invalid-event_name";
};
