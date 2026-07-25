"use client";

import syntheticEnquiries from "@/data/synthetic-enquiries.json";
import type { EnquiryInput, TriageResult } from "@/lib/types";
import { useMemo, useState } from "react";

type TabId = "submit" | "batch" | "review";

const emptyForm: EnquiryInput = {
  description: "",
  industry: "",
  companySize: "",
  urgency: "medium",
};

function truncate(text: string, max = 72): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function ConfidenceBadge({ value }: { value: number }) {
  const tone =
    value >= 0.8
      ? "bg-emerald-100 text-emerald-800"
      : value >= 0.7
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {(value * 100).toFixed(0)}%
    </span>
  );
}

function ResultCard({ result }: { result: TriageResult }) {
  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
          {result.classification.serviceLine}
        </span>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800">
          {result.classification.complexity}
        </span>
        <ConfidenceBadge value={result.classification.confidence} />
        {result.routing.routeToIntakeReview && (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
            Human review
          </span>
        )}
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-zinc-500">Assigned team lead</dt>
          <dd className="text-zinc-900">{result.routing.assignedTeamLead}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Priority / SLA</dt>
          <dd className="text-zinc-900">
            {result.routing.priority} · {result.routing.slaHours}h
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Source</dt>
          <dd className="capitalize text-zinc-900">{result.source}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Status</dt>
          <dd className="text-zinc-900">{result.status}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-zinc-500">Reasoning</dt>
          <dd className="text-zinc-900">{result.classification.reasoning}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-zinc-500">Tags</dt>
          <dd className="flex flex-wrap gap-2">
            {result.classification.suggestedTags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-white px-2 py-1 text-xs text-zinc-700 ring-1 ring-zinc-200"
              >
                {tag}
              </span>
            ))}
          </dd>
        </div>
      </dl>

      {result.errorReason && (
        <p className="mt-4 text-sm text-amber-700">
          Fallback triggered: {result.errorReason}
        </p>
      )}
    </div>
  );
}

function ResultsTable({ results }: { results: TriageResult[] }) {
  if (results.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
        No results yet. Run batch triage to populate this view.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-3 font-medium">Enquiry</th>
            <th className="px-4 py-3 font-medium">Service line</th>
            <th className="px-4 py-3 font-medium">Complexity</th>
            <th className="px-4 py-3 font-medium">Team lead</th>
            <th className="px-4 py-3 font-medium">Confidence</th>
            <th className="px-4 py-3 font-medium">Review</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {results.map((result, index) => (
            <tr key={`${result.input.description}-${index}`}>
              <td className="max-w-xs px-4 py-3 text-zinc-900">
                <div className="font-medium">{truncate(result.input.description)}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {result.input.industry} · {result.input.companySize} ·{" "}
                  {result.input.urgency}
                </div>
              </td>
              <td className="px-4 py-3">{result.classification.serviceLine}</td>
              <td className="px-4 py-3 capitalize">
                {result.classification.complexity}
              </td>
              <td className="px-4 py-3 text-xs">{result.routing.assignedTeamLead}</td>
              <td className="px-4 py-3">
                <ConfidenceBadge value={result.classification.confidence} />
              </td>
              <td className="px-4 py-3">
                {result.routing.routeToIntakeReview ? (
                  <span className="text-orange-700">Yes</span>
                ) : (
                  <span className="text-zinc-400">No</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TriageApp() {
  const [activeTab, setActiveTab] = useState<TabId>("submit");
  const [form, setForm] = useState<EnquiryInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [singleResult, setSingleResult] = useState<TriageResult | null>(null);
  const [batchResults, setBatchResults] = useState<TriageResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reviewResults = useMemo(
    () => batchResults.filter((result) => result.routing.routeToIntakeReview),
    [batchResults],
  );

  async function submitSingle(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Triage request failed");
      }

      setSingleResult(data as TriageResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  async function runBatchTriage() {
    setBatchRunning(true);
    setError(null);

    try {
      const enquiries = syntheticEnquiries.map(({ description, industry, companySize, urgency }) => ({
        description,
        industry,
        companySize,
        urgency,
      }));

      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enquiries }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Batch triage failed");
      }

      setBatchResults(data.results as TriageResult[]);
      setActiveTab("batch");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBatchRunning(false);
    }
  }

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "submit", label: "Submit enquiry" },
    { id: "batch", label: "Batch demo", count: batchResults.length || undefined },
    {
      id: "review",
      label: "Review queue",
      count: reviewResults.length || undefined,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-700">
          AIVC Take Home
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">Intake Triage Agent</h1>
        <p className="max-w-3xl text-zinc-600">
          Classify inbound enquiries by service line and complexity, then route them
          to the right team lead with deterministic business rules and human-review
          fallbacks.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-blue-700 ring-1 ring-zinc-200 ring-b-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {activeTab === "submit" && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <form onSubmit={submitSingle} className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Description
              </label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder="Describe what the client needs..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Industry
                </label>
                <input
                  required
                  value={form.industry}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      industry: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Company size
                </label>
                <input
                  required
                  value={form.companySize}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      companySize: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Urgency
                </label>
                <select
                  value={form.urgency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      urgency: event.target.value as EnquiryInput["urgency"],
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-fit items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Triaging..." : "Triage enquiry"}
            </button>
          </form>

          {singleResult && <ResultCard result={singleResult} />}
        </section>
      )}

      {activeTab === "batch" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600">
              Run all {syntheticEnquiries.length} synthetic enquiries through the
              triage pipeline.
            </p>
            <button
              type="button"
              onClick={runBatchTriage}
              disabled={batchRunning}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {batchRunning ? "Running batch..." : "Run batch triage"}
            </button>
          </div>
          <ResultsTable results={batchResults} />
        </section>
      )}

      {activeTab === "review" && (
        <section className="space-y-4">
          <p className="text-sm text-zinc-600">
            Enquiries flagged for human review due to low confidence, ambiguity,
            complexity, or urgency rules.
          </p>
          {batchResults.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
              Run batch triage first to populate the review queue.
            </p>
          ) : (
            <ResultsTable results={reviewResults} />
          )}
        </section>
      )}
    </div>
  );
}
