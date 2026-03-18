export interface Config {
    project: string;
    version: string;
    heartbeat_interval_seconds: number;
    lock_timeout_seconds: number;
    stall_threshold_seconds: number;
    max_attempts_before_escalation: number;
    dashboard_port: number;
}
export declare function loadConfig(root: string): Promise<Config>;
//# sourceMappingURL=config.d.ts.map