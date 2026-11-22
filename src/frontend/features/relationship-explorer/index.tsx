"use client";
import dynamic from "next/dynamic";
import { Component, useState, type ReactNode } from "react";
const Scene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => <p className="hint">Loading relationship explorer…</p>,
});
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="hint">
        3D is unavailable on this device. Use the record list below.
      </p>
    ) : (
      this.props.children
    );
  }
}
export function RelationshipExplorer({ count }: { count: number }) {
  const [show, setShow] = useState(false);
  const [supported, setSupported] = useState(true);
  return (
    <section className="relationship-explorer">
      <div>
        <h3>Your relationship network</h3>
        <p className="muted">
          {count} visible records. Explore a compact constellation of your
          workspace.
        </p>
      </div>
      <button
        className="button secondary"
        onClick={() => {
          if (!show) {
            const capable =
              window.matchMedia("(min-width: 768px)").matches &&
              !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            setSupported(capable);
          }
          setShow(!show);
        }}
      >
        {show ? "Close explorer" : "Explore in 3D"}
      </button>
      {show &&
        (supported ? (
          <Boundary>
            <Scene count={count} />
          </Boundary>
        ) : (
          <p className="hint">
            The accessible list below is available on small screens and when
            reduced motion is preferred.
          </p>
        ))}
    </section>
  );
}
