import chalk from "chalk";

export function log(s: string) {
    console.log("[LOG] " + s);
}

export function warn(s: string) {
    console.log(chalk.yellow("[WARNING]") + " " + s);
}
