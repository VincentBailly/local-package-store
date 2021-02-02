import * as fs from "fs";
import * as path from "path";

/**
 * Install the given dependency graph in the given folder.
 * 
 * @param location Absolute path of an empty directory in which the installation will take place.
 */
export function installLocalStore(location: string) {
    const locationError = getLocationError(location);
    if (locationError !== undefined) {
        throw new Error(locationError);
    }
    
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