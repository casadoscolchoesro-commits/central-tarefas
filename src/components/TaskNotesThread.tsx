"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";
import { Avatar } from "@/components/Avatar";

type Note = {
  id: string;
  author_id: string;
  author_department: TaskDepartment | null;
  body: string;
  created_at: string;
  updated_at: string | null;
  author: { full_name: string; avatar_url: string | null } | { full_name: string; avatar_url: string | null }[] | null;
};

type NoteEdit = { id: string; previous_body: string; edited_at: string };

function asOne<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskNotesThread({
  taskId,
  currentUserId,
  canOverride,
  canComment,
}: {
  taskId: string;
  currentUserId: string | null;
  /** Administrador/gerência geral — só eles veem o histórico de edição. */
  canOverride: boolean;
  /** Se a pessoa pode, em princípio, comentar (o RPC ainda faz a
   * checagem de verdade — isso só decide se mostra o formulário). */
  canComment: boolean;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<NoteEdit[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadNotes() {
    const supabase = createClient();
    const { data } = await supabase
      .from("task_notes")
      .select("id, author_id, author_department, body, created_at, updated_at, author:profiles!author_id(full_name, avatar_url)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    setNotes((data ?? []) as unknown as Note[]);
    setLoaded(true);
  }

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function handleAdd() {
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("add_task_note", { p_task_id: taskId, p_body: newBody });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível salvar a observação agora.");
      return;
    }
    setNewBody("");
    setShowForm(false);
    await loadNotes();
  }

  async function handleEdit(noteId: string) {
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("edit_task_note", { p_note_id: noteId, p_new_body: editBody });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message || "Não foi possível editar agora.");
      return;
    }
    setEditingId(null);
    await loadNotes();
  }

  async function toggleHistory(noteId: string) {
    if (historyFor === noteId) {
      setHistoryFor(null);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("task_note_edits")
      .select("id, previous_body, edited_at")
      .eq("task_note_id", noteId)
      .order("edited_at", { ascending: false });
    setHistory((data ?? []) as NoteEdit[]);
    setHistoryFor(noteId);
  }

  if (!loaded) return null;
  if (notes.length === 0 && !canComment) return null;

  return (
    <div className="mt-2 border-t border-(--color-gray-100) pt-2">
      <p className="mb-1.5 text-xs font-medium text-(--color-graphite-700)">
        Observações {notes.length > 0 && `(${notes.length})`}
      </p>

      {notes.length > 0 && (
        <ul className="mb-2 space-y-2">
          {notes.map((n) => {
            const author = asOne(n.author);
            const isMine = n.author_id === currentUserId;
            return (
              <li key={n.id} className="rounded-md bg-(--color-gray-50) px-2 py-1.5">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-(--color-graphite-500)">
                  <Avatar url={author?.avatar_url ?? null} name={author?.full_name ?? "?"} size={16} />
                  <span className="font-medium text-(--color-graphite-700)">{author?.full_name ?? "—"}</span>
                  {n.author_department && <span>· {DEPARTMENT_LABELS[n.author_department]}</span>}
                  <span>· {fmt(n.created_at)}</span>
                  {n.updated_at && <span>· editado</span>}
                </div>

                {editingId === n.id ? (
                  <div className="mt-1">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
                    />
                    <div className="mt-1 flex gap-2">
                      <button
                        onClick={() => handleEdit(n.id)}
                        disabled={submitting}
                        className="rounded-md bg-(--color-red-600) px-2.5 py-1 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-0.5 text-sm text-(--color-graphite-700)">{n.body}</p>
                )}

                <div className="mt-1 flex gap-2">
                  {isMine && editingId !== n.id && (
                    <button
                      onClick={() => {
                        setEditingId(n.id);
                        setEditBody(n.body);
                      }}
                      className="text-xs text-(--color-red-600) hover:underline"
                    >
                      Editar
                    </button>
                  )}
                  {canOverride && n.updated_at && (
                    <button
                      onClick={() => toggleHistory(n.id)}
                      className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
                    >
                      {historyFor === n.id ? "Ocultar histórico" : "Ver histórico de edição"}
                    </button>
                  )}
                </div>

                {historyFor === n.id && (
                  <ul className="mt-1 space-y-1 border-t border-(--color-gray-200) pt-1">
                    {history.length === 0 ? (
                      <li className="text-xs text-(--color-graphite-500)">Sem edições registradas.</li>
                    ) : (
                      history.map((h) => (
                        <li key={h.id} className="text-xs text-(--color-graphite-500)">
                          <span className="text-(--color-graphite-400)">{fmt(h.edited_at)} — versão anterior:</span>{" "}
                          {h.previous_body}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="mb-1.5 rounded-md bg-(--color-red-50) px-2 py-1 text-xs text-(--color-red-700)">{error}</p>
      )}

      {canComment &&
        (showForm ? (
          <div>
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={2}
              placeholder="Adicione uma observação sobre essa tarefa..."
              className="w-full rounded-md border border-(--color-gray-200) px-2 py-1.5 text-sm outline-none focus:border-(--color-red-600)"
            />
            <div className="mt-1 flex gap-2">
              <button
                onClick={handleAdd}
                disabled={submitting}
                className="rounded-md bg-(--color-red-600) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-red-700) disabled:opacity-60"
              >
                {submitting ? "Salvando..." : "Salvar observação"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setNewBody("");
                }}
                className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-(--color-graphite-500) hover:text-(--color-red-600)"
          >
            + Observação
          </button>
        ))}
    </div>
  );
}
