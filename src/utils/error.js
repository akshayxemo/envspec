export function fail(message, err) {
  console.error(`\n✖ [envspec]: ${message}`);

  if (process.env.ENVSPEC_DEBUG) {
    console.error(err);
  } else {
    console.error(`→ ${err.message}`);
    console.error("(Run with --debug for details)");
  }

  process.exit(1);
}
