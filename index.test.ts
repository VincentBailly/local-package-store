import { installLocalStore } from ".";

it("finds the function", () => {
    expect(typeof installLocalStore).toBe("function");
})

/**
 * Tests to add
 * - Input validation:
 *   - location
 *     - location path does not already exist on disk
 *     - location's parent does exist on disk
 *   - dependenyGraph
 *     - contains nodes which is an array
 *     - contains links which is an array
 *     - each node have a key and location
 *     - each node key is unique
 *     - each location on disk exists and are folders
 *     - each link contain a source and a target
 *     - all sources and targets refer to a key that exists
 * - Scenarios:
 *   - empty nodes and empty links
 *   - a few nodes but no links
 *   - a few nodes and a few links
 *   - a package name has a namespace
 *   - a package with a namespace name has a bin field which is a string
 *   - a package with a bin field which is an object
 *   - circular dependencies are supported
 */