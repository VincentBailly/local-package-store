/**
 * Script to inline the worker code in the production code.
 * This allows the consumers of this package to bundle the code
 * without needed to know about the fact that we use workers.
 */

const fs = require("fs");
const path = require("path");

const copyFilesContent = fs.readFileSync(path.join("lib", "copyFiles.js"), { encoding: "utf-8"});
const workerContent = fs.readFileSync(path.join("lib", "copy.js"), { encoding: "utf-8"});

const newContent = copyFilesContent.replace("___WORKER___PLACEHOLDER___", workerContent);

fs.writeFileSync(path.join("lib", "copyFiles.js"), newContent);


const copyFilesContentEsm = fs.readFileSync(path.join("lib-esm", "copyFiles.js"), { encoding: "utf-8"});
const workerContentEsm = fs.readFileSync(path.join("lib-esm", "copy.js"), { encoding: "utf-8"});

const newContentEsm = copyFilesContentEsm.replace("___WORKER___PLACEHOLDER___", workerContentEsm);

fs.writeFileSync(path.join("lib-esm", "copyFiles.js"), newContentEsm);