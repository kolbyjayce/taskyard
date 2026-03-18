import { type Task } from "./schema.js";
import type { Config } from "./config.js";
export declare class FileStore {
    readonly root: string;
    readonly config: Config;
    constructor(root: string, config: Config);
    nextTaskId(project: string): Promise<string>;
    readTask(project: string, taskId: string): Promise<Task & {
        body: string;
    }>;
    listTasks(project: string, filter?: Partial<Pick<Task, "status" | "priority">>): Promise<Task[]>;
    createTask(project: string, fields: Partial<Task> & {
        title: string;
    }): Promise<Task>;
    updateTask(project: string, taskId: string, patch: Partial<Task>): Promise<Task>;
    acquireLock(project: string, taskId: string, agentId: string): Promise<boolean>;
    releaseLock(project: string, taskId: string): Promise<void>;
    touchHeartbeat(project: string, taskId: string): Promise<void>;
    getLockInfo(project: string, taskId: string): Promise<any>;
    appendLog(project: string, taskId: string, agentId: string, message: string): Promise<void>;
    appendChangelog(entry: string): Promise<void>;
    writeCheckpoint(project: string, taskId: string, checkpoint: {
        agent_id: string;
        completion_estimate: number;
        work_completed: string[];
        work_remaining: string[];
        known_issues: string[];
        files_modified: string[];
        notes: string;
    }): Promise<void>;
    taskDir(project: string): string;
    taskPath(project: string, taskId: string): string;
    lockPath(project: string, taskId: string): string;
}
//# sourceMappingURL=store.d.ts.map