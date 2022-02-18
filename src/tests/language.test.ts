import { Language } from "../providers/languages";

describe("Given a language enum", () => {
  test("Should return the correct language", () => {
    expect(Language.nodeJs).toBe("nodejs");
  });
});
