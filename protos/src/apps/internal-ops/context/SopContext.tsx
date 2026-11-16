// Session-local SOP state for the Internal Ops prototype.
//
// The seed SOPs come from the shared dataset and are never mutated; authoring
// (editing blocks, reassigning a node's owner, attaching files, saving a new
// version, creating a draft) updates React state for the session only. The
// authoring page keeps an unsaved working copy of the document and hands it
// back here on Save.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { sops as seedSops } from "../../../data";
import type { Sop, SopAttachment, SopDocBlock } from "../../../types/domain";

interface SopContextValue {
  sops: Sop[];
  getSop: (id: string | undefined) => Sop | undefined;
  sopsForBrand: (brandId: string) => Sop[];
  // Publishes a new document + attachments as the next version of the SOP.
  saveSop: (id: string, blocks: SopDocBlock[], attachments: SopAttachment[]) => void;
  setNodeOwner: (sopId: string, nodeId: string, ownerName: string) => void;
  // Activates, pauses, archives or re-drafts an SOP, from the SOP page.
  setStatus: (sopId: string, status: Sop["status"]) => void;
  // Signs off one of the tool calls Stella detected for a step, so the gutter
  // stops reading as a guess. "missing" actions cannot be confirmed: the tool
  // does not exist, and clicking through would hide a real gap.
  confirmAction: (sopId: string, nodeId: string, actionId: string) => void;
  // Creates an empty draft scoped to a brand and returns its id.
  createDraft: (brandId: string, name: string) => string;
  // Where the user has dragged each node in the full graph, per SOP. Session
  // only: the SOP file carries no geometry, so a reload returns to the
  // computed layout.
  nodePositions: Record<string, Record<string, { x: number; y: number }>>;
  moveNode: (sopId: string, nodeId: string, pos: { x: number; y: number }) => void;
  resetNodePositions: (sopId: string) => void;
}

const SopContext = createContext<SopContextValue | null>(null);

export function SopProvider({ children }: { children: ReactNode }) {
  const [sops, setSops] = useState<Sop[]>(seedSops);

  const getSop = useCallback((id: string | undefined) => (id ? sops.find((s) => s.id === id) : undefined), [sops]);
  const sopsForBrand = useCallback((brandId: string) => sops.filter((s) => s.brandId === brandId), [sops]);

  const saveSop = useCallback((id: string, blocks: SopDocBlock[], attachments: SopAttachment[]) => {
    setSops((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        // A block's heading and body are the source of truth for its node's
        // title and work; keep the compiled graph in step with the document.
        const nodes = s.nodes.map((n) => {
          const block = blocks.find((b) => b.nodeId === n.id);
          return block ? { ...n, title: block.heading, work: block.body } : n;
        });
        const intro = blocks.find((b) => b.nodeId === null);
        const now = new Date().toISOString();
        return {
          ...s,
          blocks,
          attachments,
          nodes,
          purpose: intro?.body ?? s.purpose,
          version: s.version + 1,
          updatedAt: now,
          versions: [
            // The outgoing current version keeps a snapshot of what it was.
            ...s.versions.map((v) => (v.version === s.version && !v.snapshot ? { ...v, snapshot: { blocks: s.blocks, nodes: s.nodes } } : v)),
            { version: s.version + 1, publishedAt: now, publishedBy: "Thom Van", note: "Edited in the Automation authoring page." },
          ],
        };
      }),
    );
  }, []);

  const setNodeOwner = useCallback((sopId: string, nodeId: string, ownerName: string) => {
    setSops((prev) =>
      prev.map((s) =>
        s.id === sopId ? { ...s, nodes: s.nodes.map((n) => (n.id === nodeId ? { ...n, ownerName } : n)) } : s,
      ),
    );
  }, []);

  const setStatus = useCallback((sopId: string, status: Sop["status"]) => {
    setSops((prev) => prev.map((s) => (s.id === sopId ? { ...s, status } : s)));
  }, []);

  const confirmAction = useCallback((sopId: string, nodeId: string, actionId: string) => {
    setSops((prev) =>
      prev.map((s) =>
        s.id === sopId
          ? {
              ...s,
              nodes: s.nodes.map((n) =>
                n.id === nodeId
                  ? {
                      ...n,
                      actions: n.actions.map((a) =>
                        a.id === actionId && a.status === "detected" ? { ...a, status: "confirmed" as const } : a,
                      ),
                    }
                  : n,
              ),
            }
          : s,
      ),
    );
  }, []);

  const createDraft = useCallback((brandId: string, name: string) => {
    const id = `sop-draft-${Date.now().toString(36)}`;
    const draft: Sop = {
      id,
      brandId,
      name,
      purpose: "",
      version: 1,
      status: "draft",
      ownerName: "Moises Reyes",
      trigger: "",
      completion: "",
      primitiveTags: [],
      workflowTags: [],
      updatedAt: new Date().toISOString(),
      versions: [{ version: 1, publishedAt: new Date().toISOString(), publishedBy: "Thom Van", note: "Draft created." }],
      nodes: [],
      edges: [],
      blocks: [
        {
          id: `${id}-intro`,
          heading: "Why this Automation exists",
          body: "",
          nodeId: null,
        },
      ],
      attachments: [],
    };
    setSops((prev) => [...prev, draft]);
    return id;
  }, []);

  const [nodePositions, setNodePositions] = useState<Record<string, Record<string, { x: number; y: number }>>>({});

  const moveNode = useCallback((sopId: string, nodeId: string, pos: { x: number; y: number }) => {
    setNodePositions((prev) => ({ ...prev, [sopId]: { ...prev[sopId], [nodeId]: pos } }));
  }, []);

  const resetNodePositions = useCallback((sopId: string) => {
    setNodePositions((prev) => {
      if (!prev[sopId]) return prev;
      const next = { ...prev };
      delete next[sopId];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ sops, getSop, sopsForBrand, saveSop, setNodeOwner, setStatus, confirmAction, createDraft, nodePositions, moveNode, resetNodePositions }),
    [sops, getSop, sopsForBrand, saveSop, setNodeOwner, setStatus, confirmAction, createDraft, nodePositions, moveNode, resetNodePositions],
  );

  return <SopContext.Provider value={value}>{children}</SopContext.Provider>;
}

export function useSops() {
  const ctx = useContext(SopContext);
  if (!ctx) throw new Error("useSops must be used within a SopProvider");
  return ctx;
}
