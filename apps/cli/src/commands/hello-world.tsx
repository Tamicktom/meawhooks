//* Libraries imports
import React, { useEffect, useState } from "react";
import { Text } from "ink";

type HelloWorldResponse = {
  message: string;
};

type HelloWorldCommandProps = {};

export function HelloWorldCommand(props: HelloWorldCommandProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const apiUrl = process.env.API_URL ?? "http://localhost:3000";

    fetch(`${apiUrl}/hello-world`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as HelloWorldResponse;
        setMessage(data.message);
        setStatus("success");
      })
      .catch((error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setMessage(errorMessage);
        setStatus("error");
      });
  }, []);

  if (status === "loading") {
    return <Text>Fetching hello-world...</Text>;
  }

  if (status === "error") {
    return <Text color="red">Error: {message}</Text>;
  }

  return <Text color="green">{message}</Text>;
}
