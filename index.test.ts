import { installLocalStore } from ".";
import type { Graph } from ".";
import { directory } from "tempy";
import * as fs from "fs";
import * as path from "path";

const emptyGraph: Graph = { nodes: [], links: [] };

it("finds the function", () => {
  expect(typeof installLocalStore).toBe("function");
});

describe("input validation", () => {
  describe("location", () => {
    it("throws if the location is a relative path", () => {
      expect(() => installLocalStore(emptyGraph, "myDir")).toThrowError(
        `Location is not an absolute path: "myDir"`
      );
    });
    it("reports the wrong path in the error when a relative path is passed", () => {
      expect(() => installLocalStore(emptyGraph, "fooBar")).toThrowError(
        `Location is not an absolute path: "fooBar"`
      );
    });

    it("throws if location points to a file", () => {
      const dir = directory();
      const filePath = path.join(dir, "file");
      fs.writeFileSync(filePath, "");
      expect(() => installLocalStore(emptyGraph, filePath)).toThrowError(
        `Location is not a directory: "${filePath}"`
      );
    });
    it("throws if location does not exist", () => {
      const dir = directory();
      const notExistentDir = path.join(dir, "foo");
      expect(() => installLocalStore(emptyGraph, notExistentDir)).toThrowError(
        `Location does not exist: "${notExistentDir}"`
      );
    });
    it("throws if location is not empty", () => {
      const dir = directory();
      fs.writeFileSync(path.join(dir, "a-file"), "");
      expect(() => installLocalStore(emptyGraph, dir)).toThrowError(
        `Location is not an empty directory: "${dir}"`
      );
    });
  });
  describe("graph", () => {
    it("throws if graph has multiple nodes with the same key", () => {
      const dir = directory();
      expect(() =>
        installLocalStore(
          {
            nodes: [
              { key: "A", location: process.cwd() },
              { key: "A", location: process.cwd() },
            ],
            links: [],
          },
          dir
        )
      ).toThrowError(`Multiple nodes have the following key: "A"`);
    });
    it("throws if a node location not an absolute path", () => {
      const dir = directory();
      expect(() =>
        installLocalStore(
          {
            nodes: [{ key: "A", location: "fooBar" }],
            links: [],
          },
          dir
        )
      ).toThrowError(`Location of a node is not absolute: "fooBar"`);
    });
    it("throws if a node location is not a directory", () => {
      const dir = directory();
      const filePath = path.join(dir, "myFile");
      const storePath = path.join(dir, "store");
      fs.mkdirSync(storePath);
      fs.writeFileSync(filePath, "");
      expect(() =>
        installLocalStore(
          {
            nodes: [{ key: "A", location: filePath }],
            links: [],
          },
          storePath
        )
      ).toThrowError(`Location of a node is not a directory: "${filePath}"`);
    });
    it("throws if a link source is an invalid key", () => {
      const dir = directory();
      expect(() =>
        installLocalStore(
          {
            nodes: [{ key: "A", location: dir }],
            links: [{ source: "B", target: "A" }],
          },
          dir
        )
      ).toThrowError(`Invalid link source: "B"`);
    });
    it("throws if a link target is an invalid key", () => {
      const dir = directory();
      expect(() =>
        installLocalStore(
          {
            nodes: [{ key: "A", location: dir }],
            links: [{ source: "A", target: "B" }],
          },
          dir
        )
      ).toThrowError(`Invalid link target: "B"`);
    });
  });
});

/**
 * Tests to add
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
