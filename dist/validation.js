"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUniqueAlias = exports.checkAliasUniqueness = exports.validateAlias = exports.validateURL = void 0;
const crypto_1 = __importDefault(require("crypto"));
const validateURL = (url) => {
    if (url === undefined) {
        return undefined;
    }
    try {
        return new URL(url).href;
    }
    catch {
        return undefined;
    }
};
exports.validateURL = validateURL;
const validateAlias = (alias) => {
    if (alias === undefined) {
        return undefined;
    }
    return /^[\w-]+$/.test(alias) ? alias : undefined;
};
exports.validateAlias = validateAlias;
const checkAliasUniqueness = (alias, jsonDatabasePath, require) => {
    const dataList = require(jsonDatabasePath);
    return dataList.findIndex((data) => data.alias === alias) < 0;
};
exports.checkAliasUniqueness = checkAliasUniqueness;
const createUniqueAlias = (jsonDatabasePath, require) => {
    let alias = crypto_1.default.randomBytes(4).toString("base64url");
    while (!(0, exports.checkAliasUniqueness)(alias, jsonDatabasePath, require)) {
        alias = crypto_1.default.randomBytes(4).toString("base64url");
    }
    return alias;
};
exports.createUniqueAlias = createUniqueAlias;
