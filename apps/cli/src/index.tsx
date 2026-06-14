#!/usr/bin/env bun
//* Libraries imports
import React from "react";
import { render } from "ink";

//* Components imports
import { ListenCommand } from "./commands/listen";

function printUsage() {
  console.log("Usage: meawhooks listen --tunnel <slug> <target-url>");
  console.log("");
  console.log("Example:");
  console.log("  meawhooks listen --tunnel my-app http://localhost:8080/webhooks");
}

function parseListenArgs(args: string[]) {
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

const command = process.argv[2];

if (command === "listen") {
  const { tunnel, targetUrl } = parseListenArgs(process.argv.slice(3));

  if (!tunnel || !targetUrl) {
    printUsage();
    process.exit(1);
  }

  try {
    new URL(targetUrl);
  } catch {
    console.log("Invalid target URL.");
    printUsage();
    process.exit(1);
  }

  render(<ListenCommand tunnel={tunnel} targetUrl={targetUrl} />);
} else {
  printUsage();
  process.exit(1);
}
