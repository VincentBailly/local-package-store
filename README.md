Install a local package store for a given dependency graph.

Usage:
```javascript
const { installLocalStore } = require("local-package-store");

const location = "<path to an empty folder>";
const dependencyGraph = {
    nodes: [{
        key: "1",
        location: "location where the uninstalled package is on disk"
    },
    {
        key: "2",
        location: "location where the uninstalled package is on disk"
    }],
    links: [{ source: "1", target: "2"}]
}

installLocalStore({
    location,
    dependencyGraph
}).then(() => {
    /* Installation is done */
})
```

The inputs are:
- The location of a store. This is where the packages will be installed on disk
- The dependency graph of external packages. Contains a list of node and a list of links between the nodes.
