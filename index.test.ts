import { installLocalStore } from ".";
import { directory } from "tempy";
import * as fs from "fs";
import * as path from "path";

it("finds the function", () => {
    expect(typeof installLocalStore).toBe("function");
})

describe("input validation", () => {
    describe("location", () => {
        it("throws if the location is a relative path", () => {
            expect(() => installLocalStore("myDir")).toThrowError(`Location is not an absolute path: "myDir"`);
        })
        it("reports the wrong path in the error when a relative path is passed", () => {
            expect(() => installLocalStore("fooBar")).toThrowError(`Location is not an absolute path: "fooBar"`);
        })
        
        it("throws if location points to a file", () => {
            const dir = directory();
            const filePath = path.join(dir, "file");
            fs.writeFileSync(filePath, "");
            expect(() => installLocalStore(filePath)).toThrowError(`Location is not a directory: "${filePath}"`);
        })
        it("throws if location does not exist", () => {
            const dir = directory();
            const notExistentDir = path.join(dir, "foo");
            expect(() => installLocalStore(notExistentDir)).toThrowError(`Location does not exist: "${notExistentDir}"`);
        })
        it("throws if location is not empty", () => {
            const dir = directory();
            fs.writeFileSync(path.join(dir, "a-file"), "");
            expect(() => installLocalStore(dir)).toThrowError(`Location is not an empty directory: "${dir}"`);
        })
    })
})



/**
 * Tests to add
 * - Input validation:
 *   - dependenyGraph
 *     - contains nodes which is an array
 *     - contains links which is an array
 *     - each node have a key and location
 *     - each node key is unique
 *     - each location on disk exists and are folders
 *     - each link contain a source and a target
 *     - all sources and targets refer to a key that exists
 * - Scenarios:
 *   - location is relative
 *   - location is absolute
 *   - empty nodes and empty links
 *   - a few nodes but no links
 *   - a few nodes and a few links
 *   - a package name has a namespace
 *   - a package with a namespace name has a bin field which is a string
 *   - a package with a bin field which is an object
 *   - circular dependencies are supported
 */