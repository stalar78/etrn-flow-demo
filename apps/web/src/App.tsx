import { useEffect, useState } from "react";

import { healthResponseSchema, type HealthResponse } from "@etrn-flow/shared";

type ApiHealthState =
  | { status: "checking" }
  | { status: "available"; payload: HealthResponse }
  | { status: "unavailable" };

export function App() {
  const [apiHealth, setApiHealth] = useState<ApiHealthState>({
    status: "checking"
  });

  useEffect(() => {
    let isMounted = true;

    fetch("/health")
      .then(async (response) => healthResponseSchema.parse(await response.json()))
      .then((payload) => {
        if (isMounted) {
          setApiHealth({ status: "available", payload });
        }
      })
      .catch(() => {
        if (isMounted) {
          setApiHealth({ status: "unavailable" });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="foundation-shell">
      <p className="eyebrow">ETRN Flow</p>
      <h1>Technical foundation is ready</h1>
      <p>
        React, TypeScript, Vite, Fastify and the shared workspace are wired for
        the first product slice.
      </p>
      <section aria-label="API health">
        <strong>API health:</strong> {renderApiHealth(apiHealth)}
      </section>
    </main>
  );
}

function renderApiHealth(apiHealth: ApiHealthState) {
  if (apiHealth.status === "checking") {
    return "checking";
  }

  if (apiHealth.status === "available") {
    return `${apiHealth.payload.status} (${apiHealth.payload.service})`;
  }

  return "not connected in this environment";
}
