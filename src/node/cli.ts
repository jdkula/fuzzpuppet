import yargs, { Argv } from "yargs";
import * as path from "node:path";

yargs(process.argv.slice(2))
  .scriptName("fuzzpuppet")
  .parserConfiguration({
    "camel-case-expansion": false,
    "strip-aliased": true,
    "strip-dashed": true,
    "greedy-arrays": false,
  })
  .example(
    '$0 "https://google.com/" corpus/ --timeout=10 -- -seed=10',
    "Start fuzzing Google's home page, passing --timeout=10 to Jazzer.js and -seed=10 to libFuzzer"
  )
  .command(
    "$0 <fuzzURL> [corpus...]",
    "Coverage-guided, in-process fuzzer for frontend JavaScript via interactions with the DOM\n\n" +
      'The "corpus" directory is optional and can be used to provide initial seed input. It is also' +
      "used to store interesting inputs between fuzzing runs.\n\n" +
      "Jazzer.js is used to facilitate communication between Node.js and libFuzzer, while FuzzPuppet communicates between it and the browser." +
      "To see Jazzer.js' options, pass in just the -h flag.\n\n" +
      'To pass options to the internal fuzzing engine (libFuzzer) use a double-dash, "--"' +
      "to mark the end of normal fuzzer arguments.\n\n" +
      "Use the PAGES_BEHIND environment variable to control how many instances of Chrome are spawned. " +
      "The default is 6.",
    (yargs: Argv) => {
      yargs
        .positional("fuzzURL", {
          describe: "URL to the website that will be fuzzed",
          type: "string",
        })
        .demandOption("fuzzURL")
        .array("corpus")
        .positional("corpus", {
          describe:
            "Paths to the corpus directories. If not given, no initial " +
            "seeds are used nor interesting inputs saved.",
          type: "string",
        });
    },
    (args: any) => {
      process.env.TARGET = args.fuzzURL;
      const reconstructed = process.argv.slice(3 + args.corpus.length);
      const harness = path.join(__dirname, "harness.js");
      process.argv.splice(
        2,
        process.argv.length - 2,
        ...["-e", "*", harness, ...args.corpus, ...reconstructed]
      );
      import("@jazzer.js/core/dist/cli");
    }
  )
  .help().argv;
