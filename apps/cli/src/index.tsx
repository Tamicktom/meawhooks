#!/usr/bin/env bun
//* Libraries imports
import React from "react";
import { render, Text } from "ink";

//* Components imports
import { HelloWorldCommand } from "./commands/hello-world";

const command = process.argv[2];

if (command === "hello-world") {
  render(<HelloWorldCommand />);
} else {
  console.log("Usage: meawhooks hello-world");
  process.exit(1);
}
