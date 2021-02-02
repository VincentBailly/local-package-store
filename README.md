Install a local package store for a given dependency graph.

Usage:
```javascript
const { installLocalStore } = require("local-package-store");

const location = "some location on disk";
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


Test cases (TODO: implement these tests)

- a package with a bin field which is a string
     - When the package name is simple
     - When the package is in a namespace
- a package with a bin field which is an object
- a package with no bin field
- all packages are installed
     - packages with a simple name
     - packages with a namespaced name
- node_modules is properly created
- the location given does not exist
- the location given already exists