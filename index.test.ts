import { installLocalStore } from ".";

it("finds the function", () => {
    expect(typeof installLocalStore).toBe("function");
})