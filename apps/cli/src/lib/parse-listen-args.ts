export function parseListenArgs(args: string[]) {
  let tunnel = "";
  let targetUrl = "";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--tunnel") {
      tunnel = args[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (!arg.startsWith("-") && !targetUrl) {
      targetUrl = arg;
    }
  }

  return { tunnel, targetUrl };
}
