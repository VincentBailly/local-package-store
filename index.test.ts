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
    it("throws if the location is a relative path", async () => {
      await expect(
        installLocalStore(emptyGraph, "myDir")
      ).rejects.toHaveProperty(
        "message",
        `Location is not an absolute path: "myDir"`
      );
    });
    it("reports the wrong path in the error when a relative path is passed", async () => {
      await expect(
        installLocalStore(emptyGraph, "fooBar")
      ).rejects.toHaveProperty(
        "message",
        `Location is not an absolute path: "fooBar"`
      );
    });

    it("throws if location points to a file", async () => {
      const dir = directory();
      const filePath = path.join(dir, "file");
      fs.writeFileSync(filePath, "");
      await expect(
        installLocalStore(emptyGraph, filePath)
      ).rejects.toHaveProperty(
        "message",
        `Location is not a directory: "${filePath}"`
      );
    });
    it("throws if location does not exist", async () => {
      const dir = directory();
      const notExistentDir = path.join(dir, "foo");
      await expect(
        installLocalStore(emptyGraph, notExistentDir)
      ).rejects.toHaveProperty(
        "message",
        `Location does not exist: "${notExistentDir}"`
      );
    });
    it("throws if location is not empty", async () => {
      const dir = directory();
      fs.writeFileSync(path.join(dir, "a-file"), "");
      await expect(installLocalStore(emptyGraph, dir)).rejects.toHaveProperty(
        "message",
        `Location is not an empty directory: "${dir}"`
      );
    });
  });
  describe("graph", () => {
    it("throws if graph has multiple nodes with the same key", async () => {
      const dir = directory();
      await expect(
        installLocalStore(
          {
            nodes: [
              { key: "A", name: "A", location: process.cwd() },
              { key: "A", name: "B", location: process.cwd() },
            ],
            links: [],
          },
          dir
        )
      ).rejects.toHaveProperty(
        "message",
        `Multiple nodes have the following key: "A"`
      );
    });
    it("throws if a node location not an absolute path", async () => {
      const dir = directory();
      await expect(
        installLocalStore(
          {
            nodes: [{ key: "A", name: "A", location: "fooBar" }],
            links: [],
          },
          dir
        )
      ).rejects.toHaveProperty(
        "message",
        `Location of a node is not absolute: "fooBar"`
      );
    });
    it("throws if a node location is not a directory", async () => {
      const dir = directory();
      const filePath = path.join(dir, "myFile");
      const storePath = path.join(dir, "store");
      fs.mkdirSync(storePath);
      fs.writeFileSync(filePath, "");
      await expect(
        installLocalStore(
          {
            nodes: [{ key: "A", name: "A", location: filePath }],
            links: [],
          },
          storePath
        )
      ).rejects.toHaveProperty(
        "message",
        `Location of a node is not a directory: "${filePath}"`
      );
    });
    it("throws if a link source is an invalid key", async () => {
      const dir = directory();
      await expect(
        installLocalStore(
          {
            nodes: [{ key: "A", name: "A", location: dir }],
            links: [{ source: "B", target: "A" }],
          },
          dir
        )
      ).rejects.toHaveProperty("message", `Invalid link source: "B"`);
    });
    it("throws if a link target is an invalid key", async () => {
      const dir = directory();
      await expect(
        installLocalStore(
          {
            nodes: [{ key: "A", name: "A", location: dir }],
            links: [{ source: "A", target: "B" }],
          },
          dir
        )
      ).rejects.toHaveProperty("message", `Invalid link target: "B"`);
    });
  });
});

describe("happy path", () => {
  it("Installs packages to store using keys", async () => {
    const store = directory();
    const foo = directory();
    fs.writeFileSync(path.join(foo, "foo.js"), 'console.log("foo")');
    const bar = directory();
    fs.writeFileSync(path.join(bar, "bar.js"), 'console.log("bar")');

    const graph = {
      nodes: [
        { key: "fookey", name: "foo", location: foo },
        { key: "barkey", name: "bar", location: bar },
      ],
      links: [],
    };

    await installLocalStore(graph, store);

    expect(fs.readFileSync(path.join(store, "fookey", "foo.js")).toString()).toBe(
      'console.log("foo")'
    );
    expect(fs.readFileSync(path.join(store, "barkey", "bar.js")).toString()).toBe(
      'console.log("bar")'
    );
  });
  it("Installs packages having nested folders", async () => {
    const store = directory();
    const foo = directory();
    fs.mkdirSync(path.join(foo, "bar"));
    fs.writeFileSync(path.join(foo, "bar", "foo.js"), 'console.log("foo")');

    const graph = {
      nodes: [
        { key: "fookey", name: "foo", location: foo }
      ],
      links: [],
    };

    await installLocalStore(graph, store);

    expect(fs.readFileSync(path.join(store, "fookey", "bar", "foo.js")).toString()).toBe(
      'console.log("foo")'
    );
  });
});

/**
 * Tests to add
 * - Validation:
 *   - names are valid package names
 * - Scenarios:
 *   - empty nodes and empty links
 *   - packages have nested folders
 *   - a few nodes but no links
 *   - several nodes have same name
 *   - package contains invalid files
 *   - a few nodes and a few links
 *   - a package name has a namespace
 *   - a package with a namespace name has a bin field which is a string
 *   - a package with a bin field which is an object
 *   - circular dependencies are supported
 */
