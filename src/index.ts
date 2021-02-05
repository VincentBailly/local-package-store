import * as fs from "fs";
import * as path from "path";
const cmdShim: (
  from: string,
  to: string
) => Promise<void> = require("cmd-shim");

/**
 * Dependency graph.
 */
export type Graph = {
  /**
   * Nodes of the graph.
   */
  nodes: {
    /**
     * Unique key for a node.
     */
    key: string;
    /**
     * Name of the node.
     */
    name: string;
    /**
     * Use the package in place, do not copy it to the store.
     */
    keepInPlace?: boolean;
    /**
     * List of the bins provided by this package.
     */
    bins?: { [key: string]: string };
    /**
     * Absolute path to a folder where the content of this node is stored.
     */
    location: string;
  }[];
  /**
   * Links between nodes.
   */
  links: {
    /**
     * Unique key of the source node.
     */
    source: string;
    /**
     * Unique key of the target node.
     */
    target: string;
  }[];
};

/**
 * Install the given dependency graph in the given folder.
 *
 * @param graph Dependency graph to be installed on disk.
 * @param location Absolute path of an empty directory in which the installation will take place.
 */
export async function installLocalStore(
  graph: Graph,
  location: string
): Promise<void> {
  const locationMap = new Map<string, string>();

  validateInput(graph, location);

  await installNodesInStore(graph, location, locationMap);

  const newGraph = addSelfLinks(graph);

  await linkNodes(newGraph, location, locationMap);

  await createBins(newGraph, location, locationMap);
}

function addSelfLinks(graph: Graph): Graph {
  const newGraph = {
    nodes: [...graph.nodes],
    links: [...graph.links.filter((link) => link.source !== link.target)],
  };
  graph.nodes.forEach((n) => {
    newGraph.links.push({ source: n.key, target: n.key });
  });
  return newGraph;
}

async function createBins(graph: Graph, location: string, locationMap: Map<string, string>): Promise<void> {
  const binsMap = new Map<string, Map<string, string>>();

  graph.nodes.forEach((n) => {
    if (!n.bins) {
      return;
    }
    if (!binsMap.get(n.key)) {
      binsMap.set(n.key, new Map<string, string>());
    }

    Object.keys(n.bins).forEach((binName) => {
      binsMap.get(n.key)!.set(binName, n.bins![binName]);
    });
  });

  await Promise.all(
    graph.links.map(async (link) => {
      const bins = binsMap.get(link.target);
      if (!bins) {
        return;
      }
      await fs.promises.mkdir(
        path.join(locationMap.get(link.source)!, "node_modules", ".bin"),
        { recursive: true }
      );
      for (const [binName, binLocation] of bins) {
        const binLoc = path.join(locationMap.get(link.target)!, binLocation);
        try {
          await fs.promises.stat(binLoc);
        } catch {
          continue;
        }
        const binLink = path.join(
          locationMap.get(link.source)!,
          "node_modules",
          ".bin",
          binName
        );
        await cmdShim(binLoc, binLink);
      }
    })
  );
}

async function linkNodes(graph: Graph, location: string, locationMap: Map<string, string>): Promise<void> {
  await Promise.all(
    graph.links.map(async (link) => {
      // TODO: this is very bad for perf, improve this.
      const name = graph.nodes.find((n) => n.key === link.target)!.name;
      await fs.promises.rmdir(path.join(locationMap.get(link.source)!, "node_modules"), { recursive: true});
      await fs.promises.mkdir(
        path.dirname(path.join(locationMap.get(link.source)!, "node_modules", name)),
        { recursive: true }
      );
      await fs.promises.symlink(
        locationMap.get(link.target)!,
        path.join(locationMap.get(link.source)!, "node_modules", name),
        "junction"
      );
    })
  );
}

async function installNodesInStore(
  graph: Graph,
  location: string,
  locationMap: Map<string, string>
): Promise<void> {
    for (const n of graph.nodes) {
      const key = n.key;
      const nodeLoc = n.location;
      const destination = n.keepInPlace ? n.location : path.join(location, key);
      if (!n.keepInPlace) {
        await fs.promises.mkdir(path.join(location, key));
        await copyDir(nodeLoc, path.join(location, key));
      }
      locationMap.set(key, destination)
    }
}

async function copyDir(source: string, destination: string): Promise<void> {
  const entries = fs.readdirSync(source);
  await Promise.all(
    entries.map(async (e) => {
      const stats = await fs.promises.stat(path.join(source, e));
      if (stats.isDirectory()) {
        await fs.promises.mkdir(path.join(destination, e));
        await copyDir(path.join(source, e), path.join(destination, e));
      } else if (stats.isFile()) {
        if (e !== ".yarn-metadata.json" && e !== ".yarn-tarball.tgz") {
          await fs.promises.copyFile(
            path.join(source, e),
            path.join(destination, e)
          );
        }
      }
    })
  );
}

function validateInput(graph: Graph, location: string): void {
  const locationError = getLocationError(location);
  if (locationError !== undefined) {
    throw new Error(locationError);
  }
  const GrapError = getGraphError(graph);
  if (GrapError !== undefined) {
    throw new Error(GrapError);
  }
  const binError = getBinError(graph);
  if (binError !== undefined) {
    throw new Error(binError);
  }
}

function getBinError(graph: Graph): string | undefined {
  const errors = graph.nodes
    .map((node) => {
      if (!node.bins) {
        return [];
      }
      return Object.keys(node.bins)
        .map((binName) => {
          if (/\/|\\|\n/.test(binName)) {
            return `Package "${node.key}" exposes a bin script with an invalid name: "${binName}"`;
          }
        })
        .filter((o) => o !== undefined);
    })
    .filter((a) => a.length > 0);
  if (errors.length !== 0) {
    return errors[0]![0]!;
  }

  const binsMap = new Map<string, Set<string>>();
  graph.nodes.forEach((node) => {
    const newSet = new Set<string>();
    if (node.bins) {
      Object.keys(node.bins).forEach((binName) => {
        newSet.add(binName);
      });
    }
    binsMap.set(node.key, newSet);
  });

  const binCollisionErrors: string[] = [];
  const installedBinMap = new Map<string, Set<string>>();
  graph.nodes.forEach((node) => {
    installedBinMap.set(node.key, new Set());
  });
  graph.links.forEach(({ source, target }) => {
    const targetBins = binsMap.get(target)!;
    targetBins.forEach((binName) => {
      if (installedBinMap.get(source)!.has(binName)) {
        binCollisionErrors.push(
          `Several different scripts called "${binName}" need to be installed at the same location (${source}).`
        );
      }
      installedBinMap.get(source)!.add(binName);
    });
  });

  if (binCollisionErrors.length > 0) {
    return binCollisionErrors[0];
  }

  return undefined;
}

function getGraphError(graph: Graph): string | undefined {
  const dupKey = findDups(graph.nodes.map((n) => n.key));
  if (dupKey !== undefined) {
    return `Multiple nodes have the following key: "${dupKey}"`;
  }
  const notAbsoluteLocations = graph.nodes.filter(
    (n) => !path.isAbsolute(n.location)
  );
  if (notAbsoluteLocations.length > 0) {
    return `Location of a node is not absolute: "${notAbsoluteLocations[0].location}"`;
  }

  const nodesWithInvalidName = graph.nodes.filter(
    (n) =>
      !/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-zA-Z0-9-~][a-zA-Z0-9-._~]*$/.test(
        n.name
      )
  );
  if (nodesWithInvalidName.length > 0) {
    return `Package name invalid: "${nodesWithInvalidName[0].name}"`;
  }

  const notFolderLocations = graph.nodes.filter((n) => {
    try {
      const stats = fs.statSync(n.location);
      return !stats.isDirectory();
    } catch {
      /**
       * The location does not exist, this error is treated separately.
       */
      return false;
    }
  });

  if (notFolderLocations.length > 0) {
    return `Location of a node is not a directory: "${notFolderLocations[0].location}"`;
  }

  const linksWithWrongSource = graph.links.filter(
    (l) => graph.nodes.map((n) => n.key).indexOf(l.source) === -1
  );
  if (linksWithWrongSource.length > 0) {
    return `Invalid link source: "${linksWithWrongSource[0].source}"`;
  }

  const linksWithWrongTarget = graph.links.filter(
    (l) => graph.nodes.map((n) => n.key).indexOf(l.target) === -1
  );
  if (linksWithWrongTarget.length > 0) {
    return `Invalid link target: "${linksWithWrongTarget[0].target}"`;
  }

  const dependenciesWithSameNames: {
    source: string;
    targetName: string;
  }[] = findDependenciesWithSameName(graph);
  if (dependenciesWithSameNames.length > 0) {
    const source = dependenciesWithSameNames[0].source;
    const targetName = dependenciesWithSameNames[0].targetName;
    return `Package "${source}" depends on multiple packages called "${targetName}"`;
  }
}

function findDependenciesWithSameName(
  graph: Graph
): { source: string; targetName: string }[] {
  const keyToNameMap = new Map<string, string>();
  const dependenciesMap = new Map<string, Set<string>>();
  const result: { source: string; targetName: string }[] = [];

  graph.nodes.forEach((n) => {
    keyToNameMap.set(n.key, n.name);
  });

  graph.links.forEach((l) => {
    const targetName = keyToNameMap.get(l.target)!;
    if (!dependenciesMap.get(l.source)) {
      dependenciesMap.set(l.source, new Set<string>());
    }
    if (dependenciesMap.get(l.source)!.has(targetName)) {
      result.push({ source: l.source, targetName });
    } else {
      dependenciesMap.get(l.source)!.add(targetName);
    }
  });

  return result;
}

function findDups<T>(array: T[]): T | undefined {
  if (array.length == 0) {
    return undefined;
  }
  const tail = array.slice(1);
  if (tail.indexOf(array[0]) !== -1) {
    return array[0];
  }

  return findDups(tail);
}

function getLocationError(location: string): string | undefined {
  if (!path.isAbsolute(location)) {
    return `Location is not an absolute path: "${location}"`;
  }
  try {
    const stats = fs.statSync(location);
    if (!stats.isDirectory()) {
      return `Location is not a directory: "${location}"`;
    }
    const dir = fs.readdirSync(location);
    if (dir.length > 0) {
      return `Location is not an empty directory: "${location}"`;
    }
  } catch (e) {
    return `Location does not exist: "${location}"`;
  }
}
