"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const build_task_1 = require("./build-task");
const creation_task_1 = require("./creation-task");
const deletion_task_1 = require("./deletion-task");
module.exports = async ({ github, context, core, io, exec, require, options, }) => {
    switch (context.eventName) {
        case "push":
        case "workflow_dispatch":
            await (0, build_task_1.buildTask)({ core, io, exec, require, options });
            return "success:on-push";
        case "issues":
            const { action, issue } = context.payload;
            if (action !== "opened" && action !== "edited") {
                return "error:on-issue";
            }
            const firstBody = issue.body?.split("\n")[0];
            if (firstBody === undefined) {
                return "error:on-issue";
            }
            const creationRE = /creat(e|ing)|add/i;
            const deletionRE = /delet(e|ing)|remov(e|ing)/i;
            if (creationRE.test(issue.title) ||
                creationRE.test(firstBody) ||
                issue.labels?.some((label) => creationRE.test(label.name))) {
                (0, creation_task_1.creationTask)({ github, context, require }, options);
            }
            else if (deletionRE.test(issue.title) ||
                deletionRE.test(firstBody) ||
                issue.labels?.some((label) => deletionRE.test(label.name))) {
                (0, deletion_task_1.deletionTask)({ github, context, require }, options);
            }
            return "success:on-issue";
    }
    core.warning("yaeda/shortener supports only `push`, `workflow_dispatch` and `issues` events");
    return "error:invalid-event_name";
};
