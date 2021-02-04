import { installLocalStore } from ".";
import type { Graph } from ".";
import { directory } from "tempy";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const emptyFolder: string = directory();
const emptyGraph: Graph = { nodes: [], links: [] };

it("finds the function", () => {
  expect(typeof installLocalStore).toBe("function");
});

describe("input validation", () => {
  describe("bins", () => {
    it("throws if bin names contain slashes", async () => {
      const dir = directory();
      await expect(
        installLocalStore(
          {
            nodes: [
              {
                name: "foo",
                key: "fooKey",
                location: emptyFolder,
                bins: { "/wrongBinName": "index.js" },
              },
            ],
            links: [],
          },
          dir
        )
      ).rejects.toHaveProperty(
        "message",
        'Package "fooKey" exposes a bin script with an invalid name: "/wrongBinName"'
      );
    });
    it("throws if bin names contain back-slashes", async () => {
      const dir = directory();
      await expect(
        installLocalStore(
          {
            nodes: [
              {
                name: "foo",
                key: "fooKey",
                location: emptyFolder,
                bins: { "\\wrongBinName": "index.js" },
              },
            ],
            links: [],
          },
          dir
        )
      ).rejects.toHaveProperty(
        "message",
        'Package "fooKey" exposes a bin script with an invalid name: "\\wrongBinName"'
      );
    });
    it("throws if bin names contain a new-line", async () => {
      const dir = directory();
      await expect(
        installLocalStore(
          {
            nodes: [
              {
                name: "foo",
                key: "fooKey",
                location: emptyFolder,
                bins: { "wro\nngBinName": "index.js" },
              },
            ],
            links: [],
          },
          dir
        )
      ).rejects.toHaveProperty(
        "message",
        'Package "fooKey" exposes a bin script with an invalid name: "wro\nngBinName"'
      );
    });
    it("throws if two different bin scripts with the same name have to be installed at the same location", async () => {
      const dir = directory();
      await expect(
        installLocalStore(
          {
            nodes: [
              {
                name: "foo",
                key: "foo1",
                location: emptyFolder,
                bins: { fooScript: "index.js" },
              },
              {
                name: "foobar",
                key: "foo2",
                location: emptyFolder,
                bins: { fooScript: "index.js" },
              },
              {
                name: "bar",
                key: "barKey",
                location: emptyFolder,
              },
            ],
            links: [
              { source: "barKey", target: "foo1" },
              { source: "barKey", target: "foo2" },
            ],
          },
          dir
        )
      ).rejects.toHaveProperty(
        "message",
        'Several different scripts called "fooScript" need to be installed at the same location (barKey).'
      );
    });
  });
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
    it("throws if a node is linked to two different nodes that have the same name", async () => {
      const dir = directory();
      await expect(
        installLocalStore(
          {
            nodes: [
              { key: "foo1", name: "foo", location: emptyFolder },
              { key: "foo2", name: "foo", location: emptyFolder },
              { key: "bar1", name: "bar", location: emptyFolder },
            ],
            links: [
              { source: "bar1", target: "foo1" },
              { source: "bar1", target: "foo2" },
            ],
          },
          dir
        )
      ).rejects.toHaveProperty(
        "message",
        'Package "bar1" depends on multiple packages called "foo"'
      );
    });
    it("throws if a node has an invalid name", async () => {
      const dir = directory();
      await expect(
        installLocalStore(
          {
            nodes: [{ key: "A", name: "-/3/8", location: emptyFolder }],
            links: [],
          },
          dir
        )
      ).rejects.toHaveProperty("message", 'Package name invalid: "-/3/8"');
    });
    it("throws if graph has multiple nodes with the same key", async () => {
      const dir = directory();
      await expect(
        installLocalStore(
          {
            nodes: [
              { key: "A", name: "a", location: emptyFolder },
              { key: "A", name: "b", location: emptyFolder },
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
            nodes: [{ key: "A", name: "a", location: "fooBar" }],
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
            nodes: [{ key: "A", name: "a", location: filePath }],
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
            nodes: [{ key: "A", name: "a", location: dir }],
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
            nodes: [{ key: "A", name: "a", location: dir }],
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

    expect(
      fs.readFileSync(path.join(store, "fookey", "foo.js")).toString()
    ).toBe('console.log("foo")');
    expect(
      fs.readFileSync(path.join(store, "barkey", "bar.js")).toString()
    ).toBe('console.log("bar")');
  });
  it("Installs packages having nested folders", async () => {
    const store = directory();
    const foo = directory();
    fs.mkdirSync(path.join(foo, "bar"));
    fs.writeFileSync(path.join(foo, "bar", "foo.js"), 'console.log("foo")');

    const graph = {
      nodes: [{ key: "fookey", name: "foo", location: foo }],
      links: [],
    };

    await installLocalStore(graph, store);

    expect(
      fs.readFileSync(path.join(store, "fookey", "bar", "foo.js")).toString()
    ).toBe('console.log("foo")');
  });
  it("Links packages as specified in the graph", async () => {
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
      links: [{ source: "fookey", target: "barkey" }],
    };

    await installLocalStore(graph, store);

    expect(
      fs
        .readFileSync(
          path.join(store, "fookey", "node_modules", "bar", "bar.js")
        )
        .toString()
    ).toBe('console.log("bar")');
  });
  it("Creates simple bin script", async () => {
    const store = directory();
    const foo = directory();
    await fs.promises.writeFile(
      path.join(foo, "package.json"),
      '{"scripts":{"bar": "bar"}}'
    );
    const bar = directory();
    await fs.promises.writeFile(
      path.join(bar, "myBin"),
      '#!/usr/bin/env node\nconsole.log("Hello from bar");'
    );

    const graph = {
      nodes: [
        { key: "fookey", name: "foo", location: foo },
        { key: "barkey", name: "bar", bins: { bar: "myBin" }, location: bar },
      ],
      links: [{ source: "fookey", target: "barkey" }],
    };

    await installLocalStore(graph, store);

    const scriptOutput = execSync("npm run --silent bar", {
      encoding: "utf-8",
      cwd: path.join(store, "fookey"),
    }).trim();

    expect(scriptOutput).toBe("Hello from bar");
  });
});

describe("special-cases", () => {
  it("accept several nodes having the sane name", async () => {
    const store = directory();

    const graph = {
      nodes: [
        { key: "fookey", name: "bar", location: emptyFolder },
        { key: "barkey", name: "bar", location: emptyFolder },
      ],
      links: [],
    };

    await installLocalStore(graph, store);
  });
  it("installed packages named with a namespace", async () => {
    const store = directory();
    const foo = directory();
    await fs.promises.writeFile(
      path.join(foo, "index.js"),
      'console.log("hello from foo");'
    );
    const graph = {
      nodes: [
        { key: "fookey", name: "@namespace/foo", location: foo },
        { key: "barkey", name: "bar", location: emptyFolder },
      ],
      links: [{source: "barkey", target: "fookey"}],
    };

    await installLocalStore(graph, store);

    await fs.promises.stat(path.join(store, "barkey", "node_modules", "@namespace", "foo", "index.js"))
  });
  it("installs bins that are in a nested folder", async () => {
    const store = directory();
    const foo = directory();
    await fs.promises.writeFile(
      path.join(foo, "package.json"),
      '{"scripts":{"bar": "bar"}}'
    );
    const bar = directory();
    await fs.promises.mkdir(path.join(bar, "sub"));
    await fs.promises.writeFile(
      path.join(bar, "sub", "myBin"),
      '#!/usr/bin/env node\nconsole.log("Hello from bar");'
    );

    const graph = {
      nodes: [
        { key: "fookey", name: "foo", location: foo },
        { key: "barkey", name: "bar", bins: { bar: "./sub/myBin" }, location: bar },
      ],
      links: [{ source: "fookey", target: "barkey" }],
    };

    await installLocalStore(graph, store);

    const scriptOutput = execSync("npm run --silent bar", {
      encoding: "utf-8",
      cwd: path.join(store, "fookey"),
    }).trim();

    expect(scriptOutput).toBe("Hello from bar");
  })
  it("always add a dependency from a package to itself", async () => {
    const store = directory();
    const foo = directory();
    await fs.promises.writeFile(
      path.join(foo, "index.js"), "");

    const graph = {
      nodes: [
        { key: "fookey", name: "foo", location: foo }
      ],
      links: [],
    };

    await installLocalStore(graph, store);

    await fs.promises.stat(path.join(store, "fookey", "node_modules", "foo", "index.js"))
  })
  it("allows dependencies to self to be declared explicitely", async () => {
    const store = directory();

    const graph = {
      nodes: [
        { key: "fookey", name: "foo", location: emptyFolder }
      ],
      links: [ {source: "fookey", target: "fookey"}],
    };

    await installLocalStore(graph, store);

  })
  it("allows circular dependencies", async () => {
    const store = directory();

    const graph = {
      nodes: [
        { key: "fookey", name: "foo", location: emptyFolder },
        { key: "barkey", name: "bar", location: emptyFolder }
      ],
      links: [ {source: "fookey", target: "barkey"},
    {source: "barkey", target: "fookey"}],
    };

    await installLocalStore(graph, store);

  })
});

/**
 * Tests to add
 * - Scenarios:
 *   - circular dependencies are supported
 *   - bin files are that don't exist are ignored but emit a warning
 *   - bin files should be relative path
 *   - a package will install its own bin scripts in its bin folder
 *   - a package can depend on itself even when it has a namespace
 */
