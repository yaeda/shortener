import crypto from "crypto";

export const validateURL = (url?: string) => {
  if (url === undefined) {
    return undefined;
  }
  try {
    return new URL(url).href;
  } catch {
    return undefined;
  }
};

export const validateAlias = (alias?: string) => {
  if (alias === undefined) {
    return undefined;
  }
  return /^[\w-]+$/.test(alias) ? alias : undefined;
};

export const checkAliasUniqueness = (
  alias: string,
  jsonDatabasePath: string,
  require: NodeRequire
) => {
  const dataList: { url: string; alias: string }[] = require(jsonDatabasePath);
  return dataList.findIndex((data) => data.alias === alias) < 0;
};

export const createUniqueAlias = (
  jsonDatabasePath: string,
  require: NodeRequire
) => {
  let alias = crypto.randomBytes(4).toString("base64url");
  while (!checkAliasUniqueness(alias, jsonDatabasePath, require)) {
    alias = crypto.randomBytes(4).toString("base64url");
  }
  return alias;
};
