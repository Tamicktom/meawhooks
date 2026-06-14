#!/usr/bin/env bun
//* Libraries imports
import React from "react";
import { render } from "ink";

//* Components imports
import { ListenCommand } from "./commands/listen";

//* Local imports
import { parseListenArgs } from "./lib/parse-listen-args";

function printUsage() {
  console.log("Usage: meawhooks listen --tunnel <slug> <target-url>");
  console.log("");
  console.log("Example:");
  console.log("  meawhooks listen --tunnel my-app http://localhost:8080/webhooks");
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
