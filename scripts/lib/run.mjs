import { spawnSync } from "node:child_process";

export function run(command, args, options = {}) {
    console.log(`\n> ${command} ${args.join(" ")}`);
    const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
    if (result.status !== 0) process.exit(result.status ?? 1);
}

export function commandOnPath(name) {
    const checker = process.platform === "win32" ? "where" : "which";
    const result = spawnSync(checker, [name], { encoding: "utf8", shell: false });
    return result.status === 0;
}
