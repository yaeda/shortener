"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const build_task_1 = require("./build-task");
const creation_task_1 = require("./creation-task");
module.exports = async ({ github, context, core, io, exec, require, options, }) => {
    console.log("=== print context ===");
    console.log(context);
    console.log("=====================");
    switch (context.eventName) {
        case "push":
        case "workflow_dispatch":
            await (0, build_task_1.buildTask)({ core, io, exec, require, options });
            return "success:on-push";
        case "issues":
            const payload = context.payload;
            const { action, issue, sender } = payload;
            console.log(action);
            console.log(issue.labels);
            if (action === "opened" || action === "edited") {
                (0, creation_task_1.creationTask)({ github, require }, context.repo, { issue, sender }, options);
                return "success:on-issue";
            }
            return "error:on-issue";
    }
    core.warning("yaeda/shortener supports only `push`, `workflow_dispatch` and `issues` events");
    return "error:invalid-event_name";
};
