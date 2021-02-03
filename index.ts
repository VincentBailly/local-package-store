import * as fs from "fs";
import * as path from "path";

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
export async function installLocalStore(graph: Graph, location: string): Promise<void> {
    validateInput(graph, location);

    await installNodesInStore(graph, location);
}

async function installNodesInStore(graph: Graph, location: string): Promise<void> {
    await Promise.all(graph.nodes.map(async n => {
        const key = n.key;
        const nodeLoc = n.location;
        await fs.promises.mkdir(path.join(location, key));
        await copyDir(nodeLoc, path.join(location, key))
    }))
}

async function copyDir(source: string, destination: string): Promise<void> {
        const entries = fs.readdirSync(source);
        await Promise.all(entries.map(async e => {
            const stats = await fs.promises.stat(path.join(source, e));
            if (stats.isDirectory()) {
                await fs.promises.mkdir(path.join(destination, e));
                await copyDir(path.join(source, e), path.join(destination, e))
            } else if (stats.isFile()) {
                await fs.promises.copyFile(path.join(source, e), path.join(destination, e));
            }
        }))
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
