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
import { deletionTask } from "./deletion-task";
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
  switch (context.eventName) {
    case "push":
    case "workflow_dispatch":
      await buildTask({ core, io, exec, require, options });
      return "success:on-push";
    case "issues":
      const { action, issue } = context.payload as IssuesEvent;
      if (action !== "opened" && action !== "edited") {
        return "error:on-issue";
      }

      const firstBody = issue.body?.split("\n")[0];
      if (firstBody === undefined) {
        return "error:on-issue";
      }

      const creationRE = /creat|add/i;
      const deletionRE = /delet|remov/i;
      if (
        creationRE.test(issue.title) ||
        creationRE.test(firstBody) ||
        issue.labels?.some((label) => creationRE.test(label.name))
      ) {
        creationTask({ github, context, require }, options);
      } else if (
        deletionRE.test(issue.title) ||
        deletionRE.test(firstBody) ||
        issue.labels?.some((label) => deletionRE.test(label.name))
      ) {
        deletionTask({ github, context, require }, options);
      }
      return "success:on-issue";
  }

  core.warning(
    "yaeda/shortener supports only `push`, `workflow_dispatch` and `issues` events"
  );
  return "error:invalid-event_name";
};
