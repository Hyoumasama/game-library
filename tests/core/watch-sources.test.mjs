import test from "node:test";
import assert from "node:assert/strict";
import { HARD_DISK, normalizeSources, withDiskSource } from "../../lib/watchSources.ts";

test("normalizes source lists", () => {
  assert.deepEqual(normalizeSources(["netflix", " Netflix ", "", "osn+", "My Service", 5]), ["Netflix", "OSN+", "My Service"]);
  assert.deepEqual(normalizeSources("Netflix"), []);
});

test("keeps Hard Disk in sync with the disk state", () => {
  assert.deepEqual(withDiskSource(["Netflix"], true), [HARD_DISK, "Netflix"]);
  assert.deepEqual(withDiskSource([HARD_DISK, "Netflix"], false), ["Netflix"]);
  assert.deepEqual(withDiskSource([HARD_DISK], true), [HARD_DISK]);
});
