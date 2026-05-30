import { debug, error, log, warn } from "cc";

export class Logger {
    static Level = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4
    };

    // 设置当前日志级别，默认开发环境为DEBUG，生产环境可设为WARN或ERROR
    static currentLevel = Logger.Level.DEBUG;

    static debug(tag = "default", ...msg) {
        if (this.currentLevel <= Logger.Level.DEBUG) {
            debug(`[DEBUG][${tag}]`, ...msg);
        }
    }

    static info(tag = "default", ...msg) {
        if (this.currentLevel <= Logger.Level.INFO) {
            log(`[INFO][${tag}]`, ...msg);
        }
    }

    static warn(tag = "default", ...msg) {
        if (this.currentLevel <= Logger.Level.WARN) {
            warn(`[WARN][${tag}]`, ...msg);
        }
    }

    static error(tag = "default", ...msg) {
        if (this.currentLevel <= Logger.Level.ERROR) {
            error(`[ERROR][${tag}]`, ...msg);
        }
    }

    // 动态设置日志级别，例如通过URL参数
    static setLevel(level) {
        this.currentLevel = level;
    }
}

// 使用示例：
// Logger.debug('Network', 'Send request to:', url);
// Logger.warn('Game', 'Config file is missing.');
