import * as fs from "fs";
import * as path from "path";

export type Args = {
    /**
     * Absolute path to an empty directory.
     */
    location: string;
}

export function installLocalStore(args: Args) {
    const locationError = getLocationError(args.location);
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