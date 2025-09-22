import c from "chalk";

export const chalk = c;

/**
 * a simple logging class that can be used to log messages to the console.
 * You can use the methods `success`, `info`, `debug`, `warning`, `error` and `fatal` to log messages with different styles.
 *
 * To style your messages, you can use the `chalk` library. It is bundled with donau
 *
 * @example
 * import { logger, chalk } from "donau";
 * logger.success(`This is a ${chalk.bold("bold success")} message`);
 */
class Log {
  private _log(label: string, style: (msg: string) => void, message: any) {
    if (!message) return;
    if (!Array.isArray(message)) message = [message];

    // don't log debug messages if not in debug mode
    if (label === "DEBUG" && process.env.RUN_MODE !== "debug") return;

    for (let i = 0; i < message.length; i++) {
      if (typeof message[i] == "object") {
        console.log(message[i]);
        continue;
      }
      console.log(
        style((i == 0 ? `[${label}]` : "").padEnd(12) + `${message[i]}`)
      );
    }
  }

  public success = (...msg: any) => this._log("SUCCESS", chalk.green, msg);
  public info = (...msg: any) => this._log("INFO", chalk.blue, msg);
  public debug = (...msg: any) => this._log("DEBUG", chalk.gray, msg);
  public warning = (msg: any) => this._log("WARNING", chalk.yellow, msg);
  public error = (...msg: any) => this._log("ERROR", chalk.red, msg);
  public fatal = (...msg: any) =>
    this._log("FATAL", chalk.bgRed.white.bold, msg);
}

/**
 * a global logger instance that can be used to log messages to the console
 *
 * You can use the methods `success`, `info`, `debug`, `warning`, `error` and `fatal` to log messages with different styles.
 *
 * To style your messages, you can use the `chalk` library. It is bundled with donau
 *
 * @example
 * import { logger, chalk } from "donau";
 * logger.success(`This is a ${chalk.bold("bold success")} message`);
 */
export const logger = new Log();
