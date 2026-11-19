#!/usr/bin/env python3
"""Produce a public, source-linked JD Learn release snapshot. Fail on missing required data."""
import csv
import datetime as dt
import io
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = "https://api.github.com/repos/jeckodevelopment/jd_learn"
RAW = "https://raw.githubusercontent.com/jeckodevelopment/jd_learn/main"
OUT = Path(__file__).resolve().parents[1] / "data"

def get(url):
    headers = {"User-Agent": "JDLearnDashboard/2.0", "Accept": "application/vnd.github+json"}
    token = os.getenv("GITHUB_TOKEN")
    if token and url.startswith("https://api.github.com/"):
        headers["Authorization"] = "Bearer " + token
    with urlopen(Request(url, headers=headers), timeout=35) as response:
        return response.read().decode("utf-8-sig")

def api(path, params=None):
    query = ("?" + urlencode(params)) if params else ""
    return json.loads(get(BASE + path + query))

def paged(path, params=None, limit=1000):
    result = []
    for page in range(1, 21):
        rows = api(path, {**(params or {}), "per_page": 100, "page": page})
        if not isinstance(rows, list):
            raise RuntimeError("Unexpected GitHub API response")
        result.extend(rows)
        if len(result) > limit:
            raise RuntimeError("Pagination limit reached; refusing incomplete data")
        if len(rows) < 100:
            return result
    raise RuntimeError("Pagination exhausted")

def priority(labels):
    names = [v.get("name", "") for v in labels]
    return next((p for p in ("P0", "P1", "P2") if p in names), "Non assegnata")

def load_previous(path):
    """Only compare against a previously committed, valid snapshot."""
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return None

def release_progress_events(old_snapshot, old_rows, new_snapshot, new_rows):
    if not isinstance(old_snapshot, dict) or not isinstance(old_rows, list):
        return []
    before = {r["id"]: r for r in old_rows if isinstance(r, dict) and r.get("id")}
    events = []
    when = new_snapshot["generatedAt"]
    commit = new_snapshot["sourceCommit"]
    for row in new_rows:
        old = before.get(row["id"])
        if not old:
            events.append({"type": "requirement_added", "at": when, "commit": commit,
                           "id": row["id"], "to": row["state"]})
        elif old.get("state") != row["state"]:
            events.append({"type": "requirement_changed", "at": when, "commit": commit,
                           "id": row["id"], "from": old.get("state"), "to": row["state"]})
    prior_prs = {p["number"] for p in old_snapshot.get("prs", []) if p.get("status") == "merged"}
    for pr in new_snapshot.get("prs", []):
        if pr.get("status") == "merged" and pr["number"] not in prior_prs:
            merged_at = pr.get("mergedAt") or ""
            if merged_at and merged_at > old_snapshot.get("generatedAt", "")[:19]:
                events.append({"type": "pr_merged", "at": merged_at, "commit": commit,
                               "number": pr["number"], "title": pr["title"], "url": pr["url"]})
    old_progress = old_snapshot.get("progress")
    new_progress = new_snapshot.get("progress")
    if old_progress is not None and new_progress is not None and old_progress != new_progress:
        events.append({"type": "estimate_changed", "at": when, "commit": commit,
                       "from": old_progress, "to": new_progress,
                       "asOf": new_snapshot.get("progressAsOf")})
    return events

def main():
    rows = list(csv.DictReader(io.StringIO(get(RAW + "/docs/REQUIREMENTS_STATUS.csv"))))
    if not rows or "Requisito" not in rows[0] or "Stato implementazione" not in rows[0]:
        raise RuntimeError("Missing canonical requirement columns")
    evidence = json.loads(get(RAW + "/docs/IMPLEMENTATION_EVIDENCE.json"))
    requirements = [{
        "id": r.get("Requisito", "").strip(),
        "area": r.get("Requisito", "").split("-", 1)[0],
        "state": r.get("Stato implementazione", ""),
        "scope": r.get("Perimetro 1.0.0", ""),
        "manual": r.get("Accettazione Joomla", ""),
        "prs": r.get("PR implementazione", ""),
        "todo": r.get("Residui implementativi 1.0.0", ""),
        "tests": r.get("Verifiche residue 1.0.0", ""),
        "criteria": r.get("Criteri 1.0.0", ""),
    } for r in rows]
    if any(not r["id"] for r in requirements):
        raise RuntimeError("Empty requirement ID")
    qa = json.loads(get(RAW + "/docs/MANUAL_QA_EVIDENCE.json"))
    if qa.get("schema") != 1 or not isinstance(qa.get("cases"), list):
        raise RuntimeError("Unsupported manual QA evidence registry")
    known_ids = {r["id"] for r in requirements}
    seen_cases = set()
    allowed_results = {"passed", "failed", "blocked", "not_run"}
    for case in qa["cases"]:
        case_id = case.get("id")
        refs = case.get("requirement_ids")
        build = case.get("build")
        if not isinstance(case_id, str) or not case_id or case_id in seen_cases:
            raise RuntimeError("Empty or duplicate QA case ID")
        seen_cases.add(case_id)
        if not isinstance(refs, list) or not refs or any(r not in known_ids for r in refs):
            raise RuntimeError("QA case references unknown requirements")
        if case.get("result") not in allowed_results or case.get("scope") not in {"partial", "full"}:
            raise RuntimeError("Unknown QA evidence result or scope")
        if not isinstance(build, dict) or not isinstance(case.get("tested_at"), str) or not case.get("evidence_url"):
            raise RuntimeError("QA record missing build, date or evidence reference")
        dt.date.fromisoformat(case["tested_at"])
        if not case["evidence_url"].startswith("https://github.com/jeckodevelopment/jd_learn/"):
            raise RuntimeError("QA evidence URL must point to a project source")
        artifact_url = build.get("artifact_url")
        if artifact_url and not artifact_url.startswith("https://github.com/jeckodevelopment/jd_learn/actions/"):
            raise RuntimeError("QA artifact URL must point to a project build")
        if case.get("scope") == "full" and case.get("result") == "passed":
            if any(r["manual"].lower() not in {"accettata", "superata", "completata", "verificata"} for r in requirements if r["id"] in refs):
                raise RuntimeError("Full acceptance evidence is inconsistent with the canonical CSV")
    pulls = paged("/pulls", {"state": "open", "sort": "updated", "direction": "desc"})
    closed = paged("/pulls", {"state": "closed", "sort": "updated", "direction": "desc"})
    pull_items = pulls + sorted(closed, key=lambda r: r.get("updated_at", ""), reverse=True)[:80]
    prs = [{
        "number": p["number"], "title": p["title"], "url": p["html_url"],
        "status": "merged" if p.get("merged_at") else ("closed" if p["state"] == "closed" else "open"),
        "draft": p.get("draft", False), "updated": p["updated_at"],
        "mergedAt": p.get("merged_at"), "labels": [v["name"] for v in p.get("labels", [])],
        "milestone": (p.get("milestone") or {}).get("title"),
        "headSha": (p.get("head") or {}).get("sha"),
    } for p in pull_items]
    issues_raw = paged("/issues", {"state": "open", "sort": "updated", "direction": "desc"})
    issues = [{
        "number": i["number"], "title": i["title"], "url": i["html_url"],
        "priority": priority(i.get("labels", [])),
        "labels": [v["name"] for v in i.get("labels", [])],
        "updated": i.get("updated_at"),
        "milestone": (i.get("milestone") or {}).get("title"),
    } for i in issues_raw if "pull_request" not in i]
    runs = api("/actions/runs", {"per_page": 100}).get("workflow_runs", [])
    by_sha = {}
    for run in runs:
        sha = run.get("head_sha")
        if sha and sha not in by_sha:
            by_sha[sha] = {
                "status": run.get("status"), "conclusion": run.get("conclusion"),
                "url": run.get("html_url"),
            }
    for pr in prs:
        pr["ci"] = by_sha.get(pr["headSha"], {"status": "unknown", "conclusion": None, "url": None})
    artifacts = api("/actions/artifacts", {"per_page": 100}).get("artifacts", [])
    packages = [a for a in artifacts if a.get("name", "").startswith("JD-Learn-") and not a.get("expired")]
    packages.sort(key=lambda a: a.get("created_at", ""), reverse=True)
    latest = packages[0] if packages else None
    reconciliation = json.loads(get(RAW + "/docs/REQUIREMENTS_RECONCILIATION.json"))
    macroareas = (reconciliation.get("implementation_progress") or {}).get("macroareas") or []
    if len(macroareas) != 9 or sum(int(a["requirements"]) for a in macroareas) != 214:
        raise RuntimeError("Invalid or incomplete macroarea reconciliation")
    estimate = evidence.get("current_implementation_estimate") or {}
    progress = estimate.get("development_evidence_floor_percent", estimate.get("percent"))
    manual_progress = estimate.get("manual_acceptance_coverage_percent")
    manual_acceptance = estimate.get("manual_acceptance") or {}
    estimate_basis = estimate.get("basis", "")
    for label, value in (("development", progress), ("manual acceptance", manual_progress)):
        if not isinstance(value, (int, float)) or not 0 <= value <= 100:
            raise RuntimeError("Missing or invalid " + label + " progress evidence")
    if not isinstance(manual_acceptance, dict):
        raise RuntimeError("Missing manual acceptance summary")
    snapshot = {
        "schema": 2,
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": "https://github.com/jeckodevelopment/jd_learn",
        "sourceCommit": api("/commits/main").get("sha"),
        "progress": progress,  # Backward-compatible alias for development progress.
        "developmentProgress": progress,
        "manualAcceptanceProgress": manual_progress,
        "manualAcceptance": manual_acceptance,
        "macroareas": macroareas,
        "progressAsOf": evidence.get("updated_at"),
        "progressBasis": estimate_basis,
        "counts": {
            "requirements": len(requirements),
            "prOpen": len(pulls),
            "issuesOpen": len(issues),
            "p0": sum(i["priority"] == "P0" for i in issues),
            "p1": sum(i["priority"] == "P1" for i in issues),
        },
        "prs": prs, "issues": issues,
        "manualQa": {"schema": 1, "updatedAt": qa.get("updated_at"), "cases": qa["cases"]},
        "package": ({
            "name": latest["name"],
            "createdAt": latest.get("created_at"),
            "url": "https://github.com/jeckodevelopment/jd_learn/actions/runs/" +
                str((latest.get("workflow_run") or {}).get("id")) + "/artifacts/" + str(latest["id"])
        } if latest else None),
        "links": {
            "plan": "https://github.com/jeckodevelopment/jd_learn/blob/main/docs/STABLE_1.0.0_PR_PLAN.md",
            "matrix": "https://github.com/jeckodevelopment/jd_learn/blob/main/docs/REQUIREMENTS_STATUS.csv",
            "evidence": "https://github.com/jeckodevelopment/jd_learn/blob/main/docs/IMPLEMENTATION_EVIDENCE.json",
            "testbook": "https://github.com/jeckodevelopment/jd_learn/blob/main/docs/QA_TESTBOOK.md",
            "securityGate": "https://github.com/jeckodevelopment/jd_learn/blob/main/docs/SECURITY_PRIVACY_RELEASE_GATE_1.0.0.md",
            "qaRegistry": "https://github.com/jeckodevelopment/jd_learn/blob/main/docs/MANUAL_QA_EVIDENCE.json",
            "qaGuide": "https://github.com/jeckodevelopment/jd_learn/blob/main/docs/MANUAL_QA_EVIDENCE.md",
        }
    }
    OUT.mkdir(exist_ok=True)
    prior_snapshot = load_previous(OUT / "snapshot.json")
    prior_rows = load_previous(OUT / "requirements.json")
    prior_history = load_previous(OUT / "history.json") or {"schema": 1, "events": []}
    if prior_history.get("schema") != 1 or not isinstance(prior_history.get("events"), list):
        raise RuntimeError("Invalid dashboard history format")
    changes = release_progress_events(prior_snapshot, prior_rows, snapshot, requirements)
    # Baseline is the first observed dataset; we cannot reconstruct earlier
    # requirement transitions from current data or PR titles.
    history = {
        "schema": 1,
        "baselineAt": prior_history.get("baselineAt") or (prior_snapshot or snapshot)["generatedAt"],
        "generatedAt": snapshot["generatedAt"],
        "events": (changes + prior_history["events"])[:200],
    }
    (OUT / "history.json").write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "snapshot.json").write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "requirements.json").write_text(json.dumps(requirements, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Synchronized", len(requirements), "requirements,", len(prs), "PR,", len(issues), "issues")

if __name__ == "__main__":
    main()

# Manual refresh trigger: 2026-11-17 22:49 Europe/Rome; no functional change.
