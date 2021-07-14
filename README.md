# mmake - modern make

`mmake` takes the best ideas from `make` and pulls them into the 21st century. `mmake` does away with the archaic syntax and hacky workarounds required for modern Makefile-based workflows.

| make                                  | mmake                                               |
| ------------------------------------- | --------------------------------------------------- |
| ❌ dummy files                        | ✅ directory targets and prerequisites              |
| ❌ `PHONY` targets                    | ✅ register commands like any other target          |
| ❌ terse, limited syntax              | ✅ familiar RegExp and callback functions           |
| ❌ magic                              | ✅ explicit and discoverable                        |
| ❌ no rebuild on source file deletion | ✅ rebuild on source file deletion (future release) |
| ❌ println debugging                  | ✅ advanced observability tools (future release)    |

## Installation

```sh
npm install --save-dev mmake # or yarn add --dev mmake
```

## Usage

### Define and invoke build rules

Here is an example rule that writes the md5 checksum of a JSON file to a sibling text file.

```js
import { invoke, register } from 'mmake';

register(
  /*
   * The first argument is a RegExp that will match the intended target.
   * Capture groups are allowed and can be used to calculate prerequisites.
   */
  /^hash-(foo|bar)\.txt$/,
  /*
   * The second argument is a callback function that takes the RegExp matches
   * array (if applicable) from the target and should return a list of string
   * prerequisites.
   */
  ([_, fooOrBar]) => [`${fooOrBar}.json`],
  /*
   * The third argument is an asynchronous function that will run if the target
   * is non-existent or older than any prerequisites. It is passed the string
   * target as its first argument, and the array of string prerequisites as its
   * second argument.
   */
  async (targetPath, [sourcePath]) => {
    /*
     * If targetPath is hash-foo.txt, then sourcePath will be foo.json.
     * (Otherwise: hash-bar.txt and bar.json, respectively.)
     */
    const hash = await calculateHash(sourcePath);
    await writeFile(targetPath, hash);
  },
);

/*
 * After registering the rules, targets can be built using the invoke method.
 */
await invoke('hash-foo.txt');
```

Directories can be used as targets or prerequisites, too. In the case of a directory target, `mmake` will recurse the directory to find the oldest file's timestamp, which will be used to determine whether or not the recipe needs to be run (and for directory prerequisites: the newest file).

Any JavaScript can be run as part of a target's recipe. The recipe doesn't have to create the target file, either; this can be useful for executing commands that should always run each time they are requested (like `PHONY` targets in a traditional Makefile).

### Build targets using a command-line interface

A simple CLI can be fashioned by making the rule script executable and passing command-line arguments to `invoke()`:

```js
#!/usr/bin/env node
import { invoke, register } from 'mmake';

register(...);
register(...);
register(...);

for (const requisite of process.argv.slice(2)) {
  await invoke(requisite);
}
```
