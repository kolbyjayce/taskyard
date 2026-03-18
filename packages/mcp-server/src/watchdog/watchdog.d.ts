import type { FileStore } from "../store.js";
import type { Config } from "../config.js";
export declare class Watchdog {
    private store;
    private config;
    private timer;
    constructor(store: FileStore, config: Config);
    start(): void;
    stop(): void;
    private sweep;
    private reclaim;
    private flagStalled;
    private escalate;
    private listProjects;
}
//# sourceMappingURL=watchdog.d.ts.map